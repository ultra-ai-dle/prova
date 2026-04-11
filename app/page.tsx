"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GridLinearPanel } from "@/features/visualization/GridLinearPanel";
import { GraphPanel } from "@/features/visualization/GraphPanel";
import { CallTreePanel } from "@/features/visualization/CallTreePanel";
import { buildCallTree } from "@/features/visualization/callTreeBuilder";
import { ProvaRuntime } from "@/features/execution/runtime";
import { AnalyzeMetadata, AnnotatedStep, RawTraceStep } from "@/types/prova";
import { useProvaStore } from "@/store/useProvaStore";
import { resolveGraphMode } from "@/lib/graphModeInference";
import { normalizeAndDedupeTags } from "@/lib/tagNormalize";
import { getFromCache, saveToCache } from "@/lib/analyzeCache";
import { IconFiles, IconSettings, IconRefresh, IconExpand, IconWarning, IconPencil } from "@/components/icons";
import { detectLanguageFromCode, PY_KEYWORDS, JS_KEYWORDS } from "@/lib/languageDetection";

/* ── Helpers ─────────────────────────────────────────────── */
function runButtonLabel(
  status: string,
  hasTrace: boolean,
  isCodeEmpty: boolean,
  isStdinEmpty: boolean,
  language = "python",
) {
  if (isCodeEmpty) return "코드를 입력하세요";
  if (isStdinEmpty) return "예시 입력을 입력하세요";
  if (status === "loading")
    return language === "javascript"
      ? "JS 환경 준비 중..."
      : "Python 준비 중...";
  if (status === "running") return "디버깅 중...";
  if (status === "reinitializing") return "초기화 중...";
  if (status === "error") return "디버깅 불가";
  return hasTrace ? "▶ 디버깅 다시 실행" : "▶ 디버깅 시작";
}

function highlightJsLine(
  line: string,
): Array<{ text: string; className: string }> {
  const tokens: Array<{ text: string; className: string }> = [];
  const pattern =
    /(\/\/.*$|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_$][A-Za-z0-9_$]*\b|\b\d+(?:\.\d+)?\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(line);
  while (match) {
    if (match.index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, match.index),
        className: "text-[#c9d1d9]",
      });
    }
    const token = match[0];
    if (token.startsWith("//")) {
      tokens.push({ text: token, className: "text-[#8b949e] italic" });
    } else if (/^["`']/.test(token)) {
      tokens.push({ text: token, className: "text-[#a5d6ff]" });
    } else if (/^\d/.test(token)) {
      tokens.push({ text: token, className: "text-[#79c0ff]" });
    } else if (JS_KEYWORDS.has(token)) {
      tokens.push({ text: token, className: "text-[#ff7b72]" });
    } else {
      tokens.push({ text: token, className: "text-[#d2a8ff]" });
    }
    lastIndex = match.index + token.length;
    match = pattern.exec(line);
  }
  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), className: "text-[#c9d1d9]" });
  }
  if (tokens.length === 0) {
    tokens.push({ text: " ", className: "text-[#c9d1d9]" });
  }
  return tokens;
}

function highlightPythonLine(
  line: string,
): Array<{ text: string; className: string }> {
  const tokens: Array<{ text: string; className: string }> = [];
  const pattern =
    /(#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(line);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, match.index),
        className: "text-[#c9d1d9]",
      });
    }
    const token = match[0];

    if (token.startsWith("#")) {
      tokens.push({ text: token, className: "text-[#8b949e] italic" });
    } else if (token.startsWith('"') || token.startsWith("'")) {
      tokens.push({ text: token, className: "text-[#a5d6ff]" });
    } else if (/^\d/.test(token)) {
      tokens.push({ text: token, className: "text-[#79c0ff]" });
    } else if (PY_KEYWORDS.has(token)) {
      tokens.push({ text: token, className: "text-[#ff7b72]" });
    } else {
      tokens.push({ text: token, className: "text-[#d2a8ff]" });
    }

    lastIndex = match.index + token.length;
    match = pattern.exec(line);
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), className: "text-[#c9d1d9]" });
  }

  if (tokens.length === 0) {
    tokens.push({ text: " ", className: "text-[#c9d1d9]" });
  }
  return tokens;
}

function lineFromOffset(text: string, offset: number) {
  return text.slice(0, Math.max(0, offset)).split("\n").length;
}

const LAST_EXECUTED_CODE_KEY = "prova:lastExecutedCode";
const LAST_EXECUTED_STDIN_KEY = "prova:lastExecutedStdin";
const LAST_SELECTED_LANGUAGE_KEY = "prova:lastSelectedLanguage";
const BLOCKED_RUNTIME_VAR_NAMES = new Set([
  "modules",
  "version",
  "hexversion",
  "api_version",
  "copyright",
  "platform",
  "maxsize",
  "float_info",
  "int_info",
  "hash_info",
  "maxunicode",
  "builtin_module_names",
  "stdlib_module_names",
  "byteorder",
  "thread_info",
  "meta_path",
  "path_importer_cache",
  "path_hooks",
  "path",
  "argv",
  "orig_argv",
  "warnoptions",
  "executable",
  "prefix",
  "base_prefix",
  "exec_prefix",
  "base_exec_prefix",
  "pycache_prefix",
]);

function isRuntimeNoiseVar(name: string, value: unknown, language = "python") {
  const key = name.trim();
  if (key.startsWith("__")) return true;
  if (language === "javascript") {
    if (["console", "readline", "arguments", "fs"].includes(key)) return true;
    return false;
  }
  // Python 전용 필터
  if (BLOCKED_RUNTIME_VAR_NAMES.has(key)) return true;
  if (/(^_|import|frozen|zipimport|built-?in|site-packages|python3)/i.test(key))
    return true;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (
    typeof text === "string" &&
    /<module '|zipimporter|_frozen_importlib|built-in\)|site-packages/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function sanitizeRawTrace(
  rawTrace: RawTraceStep[],
  language = "python",
): RawTraceStep[] {
  return rawTrace.map((step) => {
    const vars = Object.fromEntries(
      Object.entries(step.vars || {}).filter(
        ([name, value]) => !isRuntimeNoiseVar(name, value, language),
      ),
    );
    return { ...step, vars };
  });
}

function sanitizeVarTypes(
  varTypes: Record<string, string>,
  language = "python",
) {
  return Object.fromEntries(
    Object.entries(varTypes || {}).filter(
      ([name]) => !isRuntimeNoiseVar(name, "", language),
    ),
  );
}

function collectUserDeclaredSymbols(code: string, language = "python") {
  const allowed = new Set<string>([
    "i",
    "j",
    "k",
    "r",
    "c",
    "x",
    "y",
    "z",
    "nx",
    "ny",
    "nr",
    "nc",
    "lj",
    "rj",
    "nk",
  ]);
  const lines = code.split("\n");
  const add = (name: string) => {
    const key = name.trim();
    if (!key) return;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return;
    if (key === "_") return;
    allowed.add(key);
  };
  const addMultiTargets = (segment: string) => {
    segment
      .split(",")
      .forEach((part) => add(part.replace(/[\(\)\[\]\{\}\s]/g, "")));
  };

  for (const raw of lines) {
    // 언어별 주석 제거
    const line = (
      language === "javascript"
        ? raw.replace(/\/\/.*/, "")
        : raw.replace(/#.*/, "")
    ).trim();
    if (!line) continue;

    if (language === "javascript") {
      // const/let/var 선언
      const jsDecl = line.match(
        /^(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
      );
      if (jsDecl) add(jsDecl[1]);

      // function 선언 + 파라미터
      const jsFn = line.match(
        /^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)/,
      );
      if (jsFn) {
        add(jsFn[1]);
        jsFn[2].split(",").forEach((arg) =>
          add(
            arg
              .replace(/[=\s].*/, "")
              .replace(/^\.\.\./, "")
              .trim(),
          ),
        );
      }

      // for 루프 변수: for (let x = ...) / for (const x of ...)
      const jsFor = line.match(
        /^for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
      );
      if (jsFor) add(jsFor[1]);

      // 일반 대입 (const/let/var 제거 후)
      const assignIdx = line.indexOf("=");
      if (
        assignIdx > 0 &&
        !line.includes("==") &&
        !line.includes(">=") &&
        !line.includes("<=") &&
        !line.includes("!=") &&
        !line.includes("=>")
      ) {
        const left = line
          .slice(0, assignIdx)
          .trim()
          .replace(/^(?:const|let|var)\s+/, "");
        if (left && !/[.([\s]/.test(left)) add(left);
      }
    } else {
      // Python 기존 로직
      const fn = line.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
      if (fn) {
        add(fn[1]);
        fn[2].split(",").forEach((arg) => add(arg.split("=")[0].trim()));
      }
      const cls = line.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (cls) add(cls[1]);
      const imp = line.match(/^import\s+(.+)$/);
      if (imp) {
        imp[1].split(",").forEach((chunk) => {
          const part = chunk.trim();
          if (!part) return;
          const asIdx = part.indexOf(" as ");
          if (asIdx >= 0) add(part.slice(asIdx + 4).trim());
          else add(part.split(".")[0]);
        });
      }
      const fromImp = line.match(/^from\s+.+\s+import\s+(.+)$/);
      if (fromImp) {
        fromImp[1].split(",").forEach((chunk) => {
          const part = chunk.trim();
          if (!part || part === "*") return;
          const asIdx = part.indexOf(" as ");
          if (asIdx >= 0) add(part.slice(asIdx + 4).trim());
          else add(part);
        });
      }
      const forLoop = line.match(/^for\s+(.+?)\s+in\s+/);
      if (forLoop) addMultiTargets(forLoop[1]);
      const withAs = line.match(/^with\s+.+\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (withAs) add(withAs[1]);
      const assignIdx = line.indexOf("=");
      if (
        assignIdx > 0 &&
        !line.includes("==") &&
        !line.includes(">=") &&
        !line.includes("<=") &&
        !line.includes("!=")
      ) {
        const left = line.slice(0, assignIdx).trim();
        if (left) addMultiTargets(left);
      }
    }
  }
  return allowed;
}

function sanitizeRawTraceWithAllowlist(
  rawTrace: RawTraceStep[],
  allowed: Set<string>,
  language = "python",
): RawTraceStep[] {
  return rawTrace.map((step) => {
    const vars = Object.fromEntries(
      Object.entries(step.vars || {}).filter(
        ([name, value]) =>
          allowed.has(name) && !isRuntimeNoiseVar(name, value, language),
      ),
    );
    return { ...step, vars };
  });
}

function sanitizeVarTypesWithAllowlist(
  varTypes: Record<string, string>,
  allowed: Set<string>,
  language = "python",
) {
  return Object.fromEntries(
    Object.entries(varTypes || {}).filter(
      ([name]) => allowed.has(name) && !isRuntimeNoiseVar(name, "", language),
    ),
  );
}

function stableStringifyObject(obj: Record<string, string>) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

async function fetchErrorExplanation(
  steps: RawTraceStep[],
  algorithm: string,
  strategy: string,
): Promise<AnnotatedStep[]> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawTrace: steps, algorithm, strategy }),
  });
  if (!res.ok || !res.body) return [];

  const chunks: AnnotatedStep[] = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() ?? "";
    for (const block of blocks) {
      const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      try {
        const parsed = JSON.parse(dataLine.slice(5));
        if (Array.isArray(parsed.chunk)) chunks.push(...parsed.chunk);
      } catch {
        /* 파싱 실패 시 무시 */
      }
    }
  }
  return chunks;
}

function maxNumericAbs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value))
    return Math.abs(value);
  if (Array.isArray(value))
    return value.reduce((m, v) => Math.max(m, maxNumericAbs(v)), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (m, v) => Math.max(m, maxNumericAbs(v)),
      0,
    );
  }
  return 0;
}

function formatWithBitMode(
  value: unknown,
  bitmaskMode: boolean,
  bitWidth: number,
): string {
  if (
    !(
      bitmaskMode &&
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0
    )
  ) {
    return JSON.stringify(value);
  }
  const bin = value.toString(2).padStart(Math.max(1, bitWidth), "0");
  return `${value} (${bin})`;
}

export default function Page() {
  const [code, setCode] = useState("");
  const [tabSize, setTabSize] = useState<2 | 4>(4);
  const [language, setLanguage] = useState("python");
  const [toasts, setToasts] = useState<
    Array<{ id: number; kind: "warn" | "ok"; message: string }>
  >([]);
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const runtimeRef = useRef<ProvaRuntime | null>(null);
  const analyzeCacheRef = useRef<Map<string, AnalyzeMetadata>>(new Map());
  const analyzeInFlightRef = useRef<Map<string, Promise<AnalyzeMetadata>>>(
    new Map(),
  );
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const editorHighlightRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef(code);
  const splitRootRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const dragTypeRef = useRef<
    "left" | "right" | "var-input" | "input-output" | "calltree" | null
  >(null);
  const dragAnchorRef = useRef<{
    leftCenterTotal: number;
    leftWidth: number;
  } | null>(null);
  const callTreeDragAnchorRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);
  const [callTreeWidth, setCallTreeWidth] = useState(208);
  const [callTreeOpen, setCallTreeOpen] = useState(true);
  const CALLTREE_MIN = 140;
  const CALLTREE_MAX = 400;
  const [paneWidths, setPaneWidths] = useState({
    left: 34,
    center: 38,
    right: 28,
  });
  const [rightHeights, setRightHeights] = useState({
    variable: 42,
    input: 30,
    output: 28,
  });
  const [editCursorLine, setEditCursorLine] = useState(1);
  const [bitmaskMode, setBitmaskMode] = useState(false);

  const {
    pyodideStatus,
    uiMode,
    rawTrace,
    mergedTrace,
    metadata,
    globalError,
    playback,
    stdin,
    setStdin,
    setPyodideStatus,
    setWorkerResult,
    setMetadata,
    setUiMode,
    setGlobalError,
    setCurrentStep,
    setPlaying,
    setSpeed,
    resetForRun,
    setAnnotated,
  } = useProvaStore();

  const currentStep = mergedTrace[playback.currentStep] ?? null;
  const previousStep = mergedTrace[playback.currentStep - 1] ?? null;
  const isRunning = pyodideStatus === "running";
  const isFallback = uiMode === "dataExploration";
  const isError = uiMode === "errorStep";
  const isVisualizing = uiMode === "visualizing" || isError || isFallback;
  const isDebugMode = uiMode !== "ready";
  const normalizedLanguage: "python" | "javascript" =
    language === "javascript" ? "javascript" : "python";
  const inferredLanguage = useMemo(
    () => detectLanguageFromCode(code, normalizedLanguage),
    [code, normalizedLanguage],
  );
  const isCodeEmpty = code.trim().length === 0;
  const isStdinEmpty =
    inferredLanguage !== "javascript" && stdin.trim().length === 0;
  const isAnalyzingCode =
    pyodideStatus === "running" && !metadata && rawTrace.length > 0;
  const displayTags = useMemo(
    () => normalizeAndDedupeTags(metadata?.tags ?? [], 20),
    [metadata?.tags],
  );
  const graphDisplayMode = useMemo(
    () => resolveGraphMode(metadata, code),
    [metadata, code],
  );
  const linearArrayVarName = useMemo(() => {
    const m = metadata?.var_mapping;
    if (!m) return undefined;
    const primary = m.PRIMARY;
    if (primary?.panel === "LINEAR") return primary.var_name;
    const linear = Object.values(m).find((item) => item.panel === "LINEAR");
    return linear?.var_name;
  }, [metadata?.var_mapping]);

  const effectiveStrategy = useMemo(() => {
    if (!metadata) return undefined;
    const tags = displayTags.length > 0 ? displayTags : (metadata.tags ?? []);
    const hasGraphTag = tags.some((tag) =>
      /그래프|graph|dfs|bfs|dijkstra|prim|kruskal|인접/i.test(tag),
    );
    const hasGridTag = tags.some((tag) =>
      /grid|2d|행렬|격자|matrix/i.test(tag),
    );
    // grid 신호가 함께 있으면 graph 태그보다 우선한다 (grid BFS/DFS 오분류 방지)
    if (hasGridTag) return "GRID" as const;
    if (hasGraphTag) return "GRAPH" as const;
    return metadata.strategy;
  }, [metadata, displayTags]);
  const isRecursive = useMemo(() => {
    if (mergedTrace.length === 0) return false;
    const tree = buildCallTree(mergedTrace);
    // 재귀 = 동일 함수명이 트리에서 2회 이상 등장하거나, 호출 깊이가 3 이상
    const funcCounts = new Map<string, number>();
    function walk(nodes: typeof tree.roots) {
      for (const n of nodes) {
        funcCounts.set(n.func, (funcCounts.get(n.func) ?? 0) + 1);
        walk(n.children);
      }
    }
    walk(tree.roots);
    const maxCount = Math.max(0, ...funcCounts.values());
    const hasDeepRecursion = [...funcCounts.values()].some((c) => c >= 2);
    const hasDeepDepth = mergedTrace.some((s) => s.scope.depth >= 4);
    return hasDeepRecursion || maxCount >= 2 || hasDeepDepth;
  }, [mergedTrace]);

  const shouldUseGraphPanel = useMemo(() => {
    if (isAnalyzingCode || !currentStep) return false;
    if (effectiveStrategy === "GRAPH") return true;
    // AI가 특수 자료구조 뷰를 지정한 변수가 있으면 GraphPanel을 사용
    if (
      metadata?.special_var_kinds &&
      Object.keys(metadata.special_var_kinds).length > 0
    )
      return true;
    return false;
  }, [
    currentStep,
    effectiveStrategy,
    isAnalyzingCode,
    metadata?.special_var_kinds,
  ]);
  const shouldShowBitToggle = useMemo(() => {
    if (!metadata) return false;
    if (metadata.uses_bitmasking) return true;
    const signals = [
      ...(metadata.tags ?? []),
      ...(metadata.detected_algorithms ?? []),
      ...(metadata.detected_data_structures ?? []),
      metadata.summary ?? "",
      metadata.display_name ?? "",
      metadata.algorithm ?? "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return /bitmask|bitwise|비트마스크|비트\s*연산/.test(signals);
  }, [metadata]);
  const bitWidth = useMemo(() => {
    if (!bitmaskMode) return 1;
    const uptoCurrent = mergedTrace.filter(
      (s) => s.step <= (currentStep?.step ?? 0),
    );
    const source = uptoCurrent.length > 0 ? uptoCurrent : mergedTrace;
    const maxAbs = source.reduce((m, s) => {
      const localMax = Object.values(s.vars ?? {}).reduce<number>(
        (mm, v) => Math.max(mm, maxNumericAbs(v)),
        0,
      );
      return Math.max(m, localMax);
    }, 0);
    return Math.max(1, Math.ceil(Math.log2(Math.max(1, maxAbs + 1))));
  }, [bitmaskMode, currentStep?.step, mergedTrace]);

  useEffect(() => {
    setBitmaskMode(shouldShowBitToggle);
  }, [shouldShowBitToggle]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragTypeRef.current || !splitRootRef.current) return;

      if (dragTypeRef.current === "calltree") {
        const anchor = callTreeDragAnchorRef.current;
        if (!anchor) return;
        const dx = e.clientX - anchor.startX;
        const raw = anchor.startWidth + dx;
        const next = Math.max(CALLTREE_MIN, Math.min(CALLTREE_MAX, raw));
        setCallTreeWidth(next);
        return;
      }

      if (
        (dragTypeRef.current === "var-input" ||
          dragTypeRef.current === "input-output") &&
        rightPaneRef.current
      ) {
        const rect = rightPaneRef.current.getBoundingClientRect();
        const minPct = (140 / Math.max(rect.height, 1)) * 100;
        const yPct = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 100;

        setRightHeights((prev) => {
          if (dragTypeRef.current === "var-input") {
            const total = prev.variable + prev.input;
            const nextVariable = Math.min(
              Math.max(yPct, minPct),
              total - minPct,
            );
            return {
              ...prev,
              variable: nextVariable,
              input: total - nextVariable,
            };
          }
          const total = prev.input + prev.output;
          const inputFromTop = yPct - prev.variable;
          const nextInput = Math.min(
            Math.max(inputFromTop, minPct),
            total - minPct,
          );
          return {
            ...prev,
            input: nextInput,
            output: total - nextInput,
          };
        });
        return;
      }

      const rect = splitRootRef.current.getBoundingClientRect();
      const minPct = (280 / Math.max(rect.width, 1)) * 100;
      const xPct = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100;

      setPaneWidths((prev) => {
        if (dragTypeRef.current === "left") {
          const total =
            dragAnchorRef.current?.leftCenterTotal ?? prev.left + prev.center;
          const nextLeft = Math.min(Math.max(xPct, minPct), total - minPct);
          return {
            ...prev,
            left: nextLeft,
            center: total - nextLeft,
          };
        }
        const leftWidth = dragAnchorRef.current?.leftWidth ?? prev.left;
        const total = 100 - leftWidth;
        const centerFromLeft = xPct - leftWidth;
        const nextCenter = Math.min(
          Math.max(centerFromLeft, minPct),
          total - minPct,
        );
        return {
          ...prev,
          left: leftWidth,
          center: nextCenter,
          right: total - nextCenter,
        };
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragTypeRef.current === "calltree") {
        const anchor = callTreeDragAnchorRef.current;
        if (anchor) {
          const dx = e.clientX - anchor.startX;
          const raw = anchor.startWidth + dx;
          if (raw < CALLTREE_MIN / 2) {
            setCallTreeOpen(true);
          } else {
            setCallTreeOpen(true);
            setCallTreeWidth(
              Math.max(CALLTREE_MIN, Math.min(CALLTREE_MAX, raw)),
            );
          }
        }
      }
      dragTypeRef.current = null;
      dragAnchorRef.current = null;
      callTreeDragAnchorRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_EXECUTED_CODE_KEY);
      if (saved && saved.trim().length > 0) {
        setCode(saved);
        codeRef.current = saved;
        setEditCursorLine(lineFromOffset(saved, saved.length));
      }
      const savedStdin = localStorage.getItem(LAST_EXECUTED_STDIN_KEY);
      if (savedStdin && savedStdin.trim().length > 0) {
        setStdin(savedStdin);
      }
      const savedLanguage = localStorage.getItem(LAST_SELECTED_LANGUAGE_KEY);
      if (savedLanguage === "python" || savedLanguage === "javascript") {
        setLanguage(savedLanguage);
      }
    } catch {
      // localStorage access can fail in strict/private environments.
    }
  }, [setStdin]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_SELECTED_LANGUAGE_KEY, language);
    } catch {
      // ignore storage failures
    }
  }, [language]);

  useEffect(() => {
    if (isRunning) return;
    if (inferredLanguage === normalizedLanguage) return;
    const timer = setTimeout(() => {
      setLanguage(inferredLanguage);
    }, 250);
    return () => clearTimeout(timer);
  }, [inferredLanguage, isRunning, normalizedLanguage]);

  const detectIndentSize = (text: string): 2 | 4 | null => {
    let gcd = 0;
    for (const line of text.split("\n")) {
      const m = line.match(/^( +)/);
      if (!m) continue;
      const n = m[1].length;
      let a = gcd,
        b = n;
      while (b) {
        [a, b] = [b, a % b];
      }
      gcd = a;
    }
    if (gcd === 0) return null;
    return gcd <= 2 ? 2 : 4;
  };

  const applyTabSizeToCode = (nextTabSize: 2 | 4) => {
    if (nextTabSize === tabSize) return;

    const converted = code
      .split("\n")
      .map((line) => {
        const indentMatch = line.match(/^[\t ]+/);
        if (!indentMatch) return line;

        const indent = indentMatch[0];
        const body = line.slice(indent.length);
        let columns = 0;
        for (const ch of indent) {
          columns += ch === "\t" ? tabSize : 1;
        }
        const level = Math.round(columns / tabSize);
        const nextIndent = " ".repeat(level * nextTabSize);
        return `${nextIndent}${body}`;
      })
      .join("\n");

    setTabSize(nextTabSize);
    setCode(converted);
  };
  const consoleLines = useMemo(() => {
    if (!currentStep) return [];

    if (Array.isArray(currentStep.stdout) && currentStep.stdout.length > 0) {
      return currentStep.stdout;
    }

    if (currentStep.runtimeError) {
      const line = currentStep.runtimeError.line ?? currentStep.line ?? "?";
      return [
        `Traceback (most recent call last): line ${line}`,
        `${currentStep.runtimeError.type}: ${currentStep.runtimeError.message}`,
      ];
    }

    return [];
  }, [currentStep]);

  const addToast = (kind: "warn" | "ok", message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [{ id, kind, message }, ...prev].slice(0, 3));
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
      kind === "ok" ? 4000 : 5000,
    );
  };

  useEffect(() => {
    setUiMode("ready");
    setMetadata(null);
    setPyodideStatus("loading");
    const runtime = new ProvaRuntime(
      {
        onReady: () => setPyodideStatus("ready"),
        onDone: async (payload) => {
          const analyzeLanguage = detectLanguageFromCode(
            codeRef.current,
            language === "javascript" ? "javascript" : "python",
          );
          if (analyzeLanguage !== language) {
            setLanguage(analyzeLanguage);
          }
          const allowlist = collectUserDeclaredSymbols(
            codeRef.current,
            analyzeLanguage,
          );
          const sanitizedRawTrace = sanitizeRawTraceWithAllowlist(
            sanitizeRawTrace(payload.rawTrace ?? [], analyzeLanguage),
            allowlist,
            analyzeLanguage,
          );
          const sanitizedVarTypes = sanitizeVarTypesWithAllowlist(
            sanitizeVarTypes(payload.varTypes ?? {}, analyzeLanguage),
            allowlist,
            analyzeLanguage,
          );
          const sanitizedPayload = {
            ...payload,
            rawTrace: sanitizedRawTrace,
            varTypes: sanitizedVarTypes,
          };
          setWorkerResult(sanitizedPayload);
          try {
            const analyzeKey = `${analyzeLanguage}\n@@\n${codeRef.current}\n@@\n${stableStringifyObject(sanitizedVarTypes)}\n@@\nmeta-v2-partition-pivot`;
            const cachedMeta =
              analyzeCacheRef.current.get(analyzeKey) ??
              (await getFromCache(analyzeKey));
            let meta: AnalyzeMetadata;
            if (cachedMeta) {
              analyzeCacheRef.current.set(analyzeKey, cachedMeta);
              meta = cachedMeta;
            } else {
              const inFlight = analyzeInFlightRef.current.get(analyzeKey);
              if (inFlight) {
                meta = await inFlight;
              } else {
                const request = (async () => {
                  const analyze = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      code: codeRef.current,
                      varTypes: sanitizedVarTypes,
                      language: analyzeLanguage,
                    }),
                  });
                  if (!analyze.ok) {
                    let detail = "";
                    let serverMessage = "";
                    try {
                      const errJson = await analyze.json();
                      serverMessage = String(errJson?.message ?? "");
                      detail = String(errJson?.error ?? errJson?.message ?? "");
                    } catch {
                      detail = "";
                    }
                    throw new Error(
                      `ANALYZE_HTTP_${analyze.status}${serverMessage ? `|${serverMessage}` : ""}${detail ? `:${detail}` : ""}`,
                    );
                  }
                  return (await analyze.json()) as AnalyzeMetadata;
                })();
                analyzeInFlightRef.current.set(analyzeKey, request);
                try {
                  meta = await request;
                  analyzeCacheRef.current.set(analyzeKey, meta);
                  saveToCache(analyzeKey, meta);
                } finally {
                  analyzeInFlightRef.current.delete(analyzeKey);
                }
              }
            }
            setMetadata(meta);
            const errorStepIndex = sanitizedRawTrace.findIndex(
              (step) => step.runtimeError,
            );
            setUiMode(errorStepIndex >= 0 ? "errorStep" : "visualizing");
            setCurrentStep(errorStepIndex >= 0 ? errorStepIndex : 0);
            setPyodideStatus("ready");

            if (errorStepIndex >= 0) {
              const contextStart = Math.max(0, errorStepIndex - 3);
              const contextEnd = Math.min(
                sanitizedRawTrace.length,
                errorStepIndex + 4,
              );
              const errorContext = sanitizedRawTrace.slice(
                contextStart,
                contextEnd,
              );
              fetchErrorExplanation(errorContext, meta.algorithm, meta.strategy)
                .then((annotated) => {
                  const sparse = new Array<AnnotatedStep>(
                    sanitizedRawTrace.length,
                  ).fill({
                    explanation: "",
                    visual_actions: [],
                    aiError: null,
                  });
                  annotated.forEach((a, i) => {
                    sparse[contextStart + i] = a;
                  });
                  setAnnotated(sparse);
                })
                .catch(() => {
                  /* AI 실패 시 무시 — 원시 에러 메시지로 fallback */
                });
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            if (message.includes("_400")) {
              setUiMode("ready");
              setPyodideStatus("ready");
              const serverMessage = message.includes("|")
                ? message.split("|")[1]?.split(":")[0]
                : "";
              addToast(
                "warn",
                serverMessage ||
                  "요청이 올바르지 않습니다. 입력 코드/트레이스를 확인해 주세요.",
              );
              return;
            }
            setUiMode("ready");
            setPyodideStatus("ready");
            setGlobalError({
              type: "NETWORK",
              message: message.includes("ANALYZE_HTTP_429")
                ? "AI 분석 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요. (429)"
                : message,
            });
            addToast(
              "warn",
              message.includes("ANALYZE_HTTP_429")
                ? "AI 한도 초과(429)로 분석에 실패했습니다."
                : "AI 분석에 실패했습니다. 오류 내용을 확인해 주세요.",
            );
          }
        },
        onError: (error) => {
          setPyodideStatus("error");
          setGlobalError({ type: "RUNTIME", message: error.message });
        },
        onTimeout: () => {
          setPyodideStatus("reinitializing");
          addToast(
            "warn",
            "실행 시간이 너무 길어 안전을 위해 중단하고 환경을 재설정합니다.",
          );
          setTimeout(() => {
            setPyodideStatus("ready");
            addToast(
              "ok",
              "환경 준비 완료. 코드를 수정 후 다시 시도해 주세요.",
            );
          }, 900);
        },
        onInvalidInput: (message) => {
          setUiMode("ready");
          setPyodideStatus("ready");
          addToast("warn", message);
        },
      },
      language,
    );
    runtime.init();
    runtimeRef.current = runtime;
    return () => runtime.destroy();
  }, [
    language,
    setCurrentStep,
    setGlobalError,
    setMetadata,
    setPyodideStatus,
    setUiMode,
    setWorkerResult,
    stdin,
  ]);

  useEffect(() => {
    if (!playback.isPlaying) {
      if (playTimer.current) clearInterval(playTimer.current);
      playTimer.current = null;
      return;
    }
    if (playTimer.current) clearInterval(playTimer.current);
    playTimer.current = setInterval(
      () => {
        const next = playback.currentStep + 1;
        if (next >= mergedTrace.length) {
          setPlaying(false);
          return;
        }
        if (mergedTrace[next]?.runtimeError) {
          setCurrentStep(next);
          setPlaying(false);
          setUiMode("errorStep");
          return;
        }
        setCurrentStep(next);
      },
      Math.max(300, 900 / playback.playbackSpeed),
    );
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [
    mergedTrace,
    playback.currentStep,
    playback.isPlaying,
    playback.playbackSpeed,
    setCurrentStep,
    setPlaying,
    setUiMode,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isThreeNavContext = !!activeEl?.closest?.(
        "[data-prova-3d-nav='true']",
      );
      if (isThreeNavContext) return;

      const target = e.target as HTMLElement | null;
      const isTypingContext =
        !!target &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable);
      if (isTypingContext) return;

      if (e.key === "ArrowLeft") setCurrentStep(playback.currentStep - 1);
      if (e.key === "ArrowRight") setCurrentStep(playback.currentStep + 1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying(!playback.isPlaying);
      }
      if (e.key === "Home") setCurrentStep(0);
      if (e.key === "End") setCurrentStep(mergedTrace.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    mergedTrace.length,
    playback.currentStep,
    playback.isPlaying,
    setCurrentStep,
    setPlaying,
  ]);

  const headerBadge = useMemo(() => {
    if (isRunning)
      return {
        text: "알고리즘 분석 중...",
        style: "border-[#e3b341]/40 bg-[#3d2b00]/60 text-[#e3b341]",
      };
    if (isFallback)
      return {
        text: "○ 알고리즘 감지 실패",
        style: "border-prova-line text-prova-muted",
      };
    if (metadata?.display_name)
      return { text: "", style: "border-prova-line text-prova-muted" };
    return {
      text: "WAITING FOR EXECUTION...",
      style: "border-prova-line text-prova-muted",
    };
  }, [isFallback, isRunning, metadata?.display_name]);

  return (
    <div className="h-screen flex flex-col bg-prova-bg text-[#e6edf3] overflow-hidden">
      {/* ── Running progress bar ────────────────────────────── */}
      <div
        className={`h-[2px] shrink-0 transition-opacity duration-300 ${isRunning ? "opacity-100 animate-pulse bg-gradient-to-r from-[#58a6ff] via-prova-green to-[#58a6ff]" : "opacity-0"}`}
      />

      {/* ── Status banners ──────────────────────────────────── */}
      {(pyodideStatus === "error" || isFallback || !!globalError) && (
        <div
          className={`shrink-0 h-9 flex items-center justify-between px-4 text-xs font-medium ${
            pyodideStatus === "error" || globalError
              ? "bg-[#5a1212] text-[#ffc1c1]"
              : "bg-[#7c4a00]/70 text-[#ffe09a]"
          }`}
        >
          <div className="flex items-center gap-2">
            <IconWarning />
            <span>
              {pyodideStatus === "error" &&
                (language === "javascript"
                  ? "JS 환경 초기화에 실패했습니다. 페이지를 새로고침해 주세요."
                  : "Python 환경 초기화에 실패했습니다. 페이지를 새로고침해 주세요.")}
              {isFallback &&
                "AI 연결에 실패했습니다. 기본 변수 뷰로 코드 흐름을 추적합니다."}
              {!isFallback &&
                globalError &&
                `AI 분석 실패: ${globalError.message}`}
            </span>
          </div>
          {pyodideStatus === "error" && (
            <button
              className="border border-current rounded px-3 py-1 hover:bg-white/10 transition-colors"
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
          )}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="shrink-0 h-11 bg-[#161b22] border-b border-prova-line flex items-center px-3 gap-4">
        {/* Logo */}
        <div className="font-bold text-[15px] tracking-tight shrink-0">
          Pro<span className="text-prova-green">va</span>
        </div>

        {/* Status badge — centered */}
        <div className="flex-1 flex justify-center">
          {headerBadge.text ? (
            <div
              className={`text-[11px] rounded-full border px-3 py-[3px] font-mono tracking-wide ${headerBadge.style}`}
            >
              {headerBadge.text}
            </div>
          ) : null}
        </div>

        <button
          className="w-7 h-7 flex items-center justify-center rounded text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors shrink-0"
          aria-label="설정"
          title="설정"
        >
          <IconSettings />
        </button>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* 3-column main area (resizable) */}
        <div ref={splitRootRef} className="flex-1 flex min-h-0 min-w-0">
          {/* ── Code Editor ───────────────────────────── */}
          <section
            className="min-h-0 flex flex-col min-w-0"
            style={{ width: `${paneWidths.left}%` }}
          >
            {/* Section header */}
            <div
              className={`shrink-0 h-9 flex items-center justify-between px-3 border-b transition-colors ${
                isDebugMode
                  ? "border-[#58a6ff]/25 bg-[#0d1520]"
                  : "border-prova-line bg-[#0f141a]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium truncate">
                  {language === "javascript" ? "algorithm.js" : "algorithm.py"}
                </span>
                {isVisualizing && (
                  <span
                    className={`shrink-0 text-[10px] px-2 py-[2px] rounded-full border font-medium ${
                      isError
                        ? "border-prova-red/40 bg-[#2d1112]/60 text-prova-red"
                        : "border-prova-green/40 bg-[#1a4731]/60 text-prova-green"
                    }`}
                  >
                    {isError ? "error" : "ready"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  className="h-7 rounded border border-prova-line bg-[#161b22] text-[11px] text-[#c9d1d9] px-2 focus:outline-none"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  aria-label="코드 언어 선택"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java" disabled>
                    Java (준비중)
                  </option>
                  <option value="cpp" disabled>
                    C++ (준비중)
                  </option>
                </select>
                <button
                  className="h-7 px-2 rounded border border-prova-line bg-[#21262d] text-[10px] font-mono text-[#c9d1d9] hover:border-[#58a6ff]/40 transition-colors"
                  onClick={() => applyTabSizeToCode(tabSize === 2 ? 4 : 2)}
                  title={`현재 Tab ${tabSize} — 클릭하여 Tab ${tabSize === 2 ? 4 : 2}로 전환`}
                >
                  Tab {tabSize}
                </button>
              </div>
            </div>
            {displayTags.length > 0 && (
              <div className="shrink-0 px-3 py-2 border-b border-prova-line bg-[#0d1117]">
                <div className="flex items-center gap-2 flex-nowrap overflow-x-auto prova-scrollbar whitespace-nowrap">
                  {displayTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center h-6 rounded border border-[#58a6ff]/35 bg-[#1f3555]/35 px-2 text-[11px] text-[#9ac7ff] font-medium shrink-0"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Code lines */}
            <div
              className={`flex-1 overflow-hidden relative transition-colors ${isDebugMode ? "bg-[#0c1016]" : "bg-prova-bg"}`}
            >
              {/* Copy / Edit / Wrap overlay buttons */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                {isDebugMode && (
                  <button
                    className="h-6 w-6 flex items-center justify-center rounded border border-[#e3b341]/40 bg-[#3d2b00]/80 text-[#e3b341] hover:bg-[#4a3500] hover:border-[#e3b341]/70 transition-colors"
                    onClick={() => {
                      setPlaying(false);
                      setUiMode("ready");
                    }}
                    title="편집 모드로 전환"
                    aria-label="편집 모드로 전환"
                  >
                    <IconPencil />
                  </button>
                )}
                <button
                  className={`h-6 w-6 flex items-center justify-center rounded border transition-colors ${
                    wordWrap
                      ? "border-[#58a6ff]/50 bg-[#1a2d4a]/60 text-[#58a6ff]"
                      : "border-prova-line bg-prova-panel/80 text-prova-muted hover:text-[#c9d1d9] hover:border-[#58a6ff]/40"
                  }`}
                  onClick={() => setWordWrap((v) => !v)}
                  title={wordWrap ? "줄 바꿈 끄기" : "줄 바꿈 켜기"}
                  aria-label="줄 바꿈 토글"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M3 12h15a3 3 0 0 1 0 6h-4" />
                    <polyline points="11 15 8 18 11 21" />
                    <line x1="3" y1="18" x2="8" y2="18" />
                  </svg>
                </button>
                <button
                  className={`h-6 w-6 flex items-center justify-center rounded border transition-colors ${
                    copied
                      ? "border-prova-green/50 bg-[#1a4731]/60 text-prova-green"
                      : "border-prova-line bg-prova-panel/80 text-prova-muted hover:text-[#c9d1d9] hover:border-[#58a6ff]/40"
                  }`}
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  title={copied ? "복사됨!" : "코드 복사"}
                  aria-label="코드 복사"
                >
                  {copied ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              {!isDebugMode ? (
                <div className="relative w-full h-full overflow-hidden">
                  <div
                    ref={editorHighlightRef}
                    className={`absolute inset-0 prova-scrollbar p-3 box-border font-mono text-[12px] leading-5 pointer-events-none ${wordWrap ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"}`}
                    style={{ tabSize }}
                    aria-hidden="true"
                  >
                    {code.length === 0 ? (
                      <div className="flex border-l-2 border-[#58a6ff]/30">
                        <span className="w-9 shrink-0 text-right pr-3 select-none text-[11px] leading-5 text-[#4a5568]">
                          1
                        </span>
                        <span
                          className={`pl-2 text-prova-muted ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}
                        >
                          {language === "javascript"
                            ? "여기에 JavaScript 코드를 입력하세요."
                            : "여기에 Python 코드를 입력하세요."}
                        </span>
                      </div>
                    ) : (
                      code.split("\n").map((line, lineIdx) => {
                        const lineNo = lineIdx + 1;
                        const isActiveLine = lineNo === editCursorLine;
                        return (
                          <div
                            key={`edit-line-${lineIdx}`}
                            className={`flex ${isActiveLine ? "bg-[#1a2533]/55 border-l-2 border-[#58a6ff]" : "border-l-2 border-transparent"}`}
                          >
                            <span
                              className={`w-9 shrink-0 text-right pr-3 select-none text-[11px] leading-5 ${
                                isActiveLine
                                  ? "text-[#58a6ff]"
                                  : "text-[#4a5568]"
                              }`}
                            >
                              {lineNo}
                            </span>
                            <span
                              className={`pl-2 ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}
                            >
                              {(language === "javascript"
                                ? highlightJsLine
                                : highlightPythonLine)(line).map(
                                (token, idx) => (
                                  <span
                                    key={`edit-${lineIdx}-${idx}`}
                                    className={token.className}
                                  >
                                    {token.text}
                                  </span>
                                ),
                              )}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <textarea
                    ref={editorRef}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setEditCursorLine(
                        lineFromOffset(
                          e.target.value,
                          e.target.selectionStart ?? 0,
                        ),
                      );
                    }}
                    onSelect={(e) => {
                      setEditCursorLine(
                        lineFromOffset(
                          code,
                          e.currentTarget.selectionStart ?? 0,
                        ),
                      );
                    }}
                    onClick={(e) => {
                      setEditCursorLine(
                        lineFromOffset(
                          code,
                          e.currentTarget.selectionStart ?? 0,
                        ),
                      );
                    }}
                    onKeyUp={(e) => {
                      setEditCursorLine(
                        lineFromOffset(
                          code,
                          e.currentTarget.selectionStart ?? 0,
                        ),
                      );
                    }}
                    onScroll={(e) => {
                      if (!editorHighlightRef.current) return;
                      const target = e.currentTarget;
                      editorHighlightRef.current.scrollTop = target.scrollTop;
                      editorHighlightRef.current.scrollLeft = target.scrollLeft;
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      const detected = detectIndentSize(pasted);
                      if (detected && detected !== tabSize)
                        setTabSize(detected);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Tab" || !editorRef.current) return;
                      e.preventDefault();
                      const el = editorRef.current;
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const indent = " ".repeat(tabSize);
                      const nextValue = `${code.slice(0, start)}${indent}${code.slice(end)}`;
                      setCode(nextValue);
                      setEditCursorLine(
                        lineFromOffset(nextValue, start + indent.length),
                      );
                      requestAnimationFrame(() => {
                        el.selectionStart = start + indent.length;
                        el.selectionEnd = start + indent.length;
                      });
                    }}
                    className={`absolute inset-0 w-full h-full resize-none prova-scrollbar bg-transparent text-transparent caret-[#c9d1d9] font-mono text-[12px] leading-5 pl-14 pr-3 py-3 box-border outline-none ${wordWrap ? "overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all" : "overflow-auto whitespace-pre"}`}
                    style={{ tabSize }}
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div
                  className={`box-border h-full p-3 prova-scrollbar ${wordWrap ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"}`}
                >
                  {code.split("\n").map((line, index) => {
                    const lineNo = index + 1;
                    const active = currentStep?.line === lineNo;
                    const error = active && currentStep?.runtimeError;
                    return (
                      <div
                        key={lineNo}
                        className={`flex font-mono text-[12px] leading-5 transition-colors ${
                          error
                            ? "bg-[#3d0b0b] border-l-2 border-prova-red"
                            : active
                              ? "bg-[#2d3748]/60 border-l-2 border-[#58a6ff]"
                              : "border-l-2 border-transparent"
                        }`}
                      >
                        <span
                          className={`w-9 shrink-0 text-right pr-3 select-none text-[11px] leading-5 ${
                            active
                              ? error
                                ? "text-prova-red"
                                : "text-[#58a6ff]"
                              : "text-[#4a5568]"
                          }`}
                        >
                          {lineNo}
                        </span>
                        <span
                          className={`pl-2 ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"} ${active && !error ? "text-white" : ""}`}
                          style={{ tabSize }}
                        >
                          {(language === "javascript"
                            ? highlightJsLine
                            : highlightPythonLine)(line).map((token, idx) => (
                            <span
                              key={`${lineNo}-${idx}`}
                              className={token.className}
                            >
                              {token.text}
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Language badge */}
            <div className="shrink-0 px-3 py-2 border-t border-prova-line bg-[#0f141a]">
              <span className="text-[10px] text-prova-muted font-mono">
                {language === "javascript"
                  ? "JavaScript ES2022 · 동기 코드만 지원 · async/await 미지원"
                  : "Python 3.11 · Standard Library · No external packages"}
              </span>
            </div>
          </section>

          {/* Joint: left-center */}
          <div
            className="w-1 shrink-0 bg-prova-line/70 hover:bg-[#58a6ff]/80 cursor-col-resize transition-colors"
            onMouseDown={() => {
              dragTypeRef.current = "left";
              dragAnchorRef.current = {
                leftCenterTotal: paneWidths.left + paneWidths.center,
                leftWidth: paneWidths.left,
              };
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="왼쪽-가운데 패널 크기 조절"
          />

          {/* ── Visualization ─────────────────────────── */}
          <section
            className="min-h-0 flex flex-col min-w-0"
            style={{ width: `${paneWidths.center}%` }}
          >
            <div className="shrink-0 min-h-9 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-prova-line bg-[#0f141a]">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium shrink-0">
                  {isFallback
                    ? "Data Exploration"
                    : isAnalyzingCode
                      ? "Analyzing..."
                      : effectiveStrategy === "GRAPH"
                        ? "Graph Visualization"
                        : effectiveStrategy === "GRID"
                          ? "Grid Visualization"
                          : effectiveStrategy === "LINEAR"
                            ? "Linear Visualization"
                            : "Hybrid Visualization"}
                </span>
                {metadata?.time_complexity && !isAnalyzingCode && (
                  <span
                    className="truncate text-[10px] font-mono text-[#8fb8e8] border border-[#58a6ff]/25 rounded px-1.5 py-0.5 bg-[#1a2330]/80"
                    title="AI 추정 시간 복잡도 (최악 기준)"
                  >
                    T: {metadata.time_complexity}
                  </span>
                )}
              </div>
              {isVisualizing && (
                <div className="flex items-center gap-1 text-prova-muted">
                  {shouldShowBitToggle && (
                    <button
                      className={`h-6 px-2 rounded border text-[10px] font-mono transition-colors ${
                        bitmaskMode
                          ? "border-[#58a6ff]/55 bg-[#15304e] text-[#9ac7ff]"
                          : "border-prova-line bg-[#161b22] text-prova-muted hover:text-[#c9d1d9]"
                      }`}
                      onClick={() => setBitmaskMode((prev) => !prev)}
                      title="비트마스킹 표시 토글"
                    >
                      BIT {bitmaskMode ? "ON" : "OFF"}
                    </button>
                  )}
                  <IconRefresh />
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-[#0d1117] flex">
              {/* Call Tree panel — shown when recursive */}
              {isRecursive && !isAnalyzingCode && mergedTrace.length > 0 && (
                <>
                  <div
                    className="shrink-0 border-r border-prova-line overflow-hidden transition-all duration-150"
                    style={{ width: callTreeOpen ? callTreeWidth : 0 }}
                  >
                    {callTreeOpen && (
                      <CallTreePanel
                        traceSteps={mergedTrace}
                        currentStep={playback.currentStep}
                        onJumpToStep={(stepIdx) => setCurrentStep(stepIdx)}
                      />
                    )}
                  </div>
                  {/* Resize handle + toggle button */}
                  <div className="relative shrink-0 flex items-center">
                    {/* Drag handle */}
                    <div
                      className="w-1 h-full bg-prova-line/70 hover:bg-[#58a6ff]/80 cursor-col-resize transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragTypeRef.current = "calltree";
                        callTreeDragAnchorRef.current = {
                          startX: e.clientX,
                          startWidth: callTreeOpen ? callTreeWidth : 0,
                        };
                        document.body.style.cursor = "col-resize";
                        document.body.style.userSelect = "none";
                      }}
                    />
                    {/* Toggle button */}
                    <button
                      className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 w-5 h-10 flex items-center justify-center rounded-r border border-l-0 border-prova-line bg-[#161b22] hover:bg-[#21262d] text-prova-muted hover:text-[#c9d1d9] transition-colors"
                      onClick={() => setCallTreeOpen((p) => !p)}
                      title={callTreeOpen ? "Call Tree 접기" : "Call Tree 열기"}
                    >
                      <svg
                        width="8"
                        height="12"
                        viewBox="0 0 8 12"
                        fill="currentColor"
                      >
                        {callTreeOpen ? (
                          <path
                            d="M6 1L2 6l4 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <path
                            d="M2 1l4 5-4 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    </button>
                  </div>
                </>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">
                {isAnalyzingCode ? (
                  <div className="h-full w-full grid place-items-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-9 w-9 rounded-full border-2 border-[#2f81f7]/25 border-t-[#58a6ff] animate-spin" />
                      <p className="text-sm font-medium text-[#c9d1d9]">
                        코드 분석중...
                      </p>
                      <p className="mt-2 text-xs text-prova-muted">
                        AI 응답을 기다리는 중입니다.
                      </p>
                    </div>
                  </div>
                ) : shouldUseGraphPanel && !isFallback ? (
                  <GraphPanel
                    step={currentStep}
                    graphMode={graphDisplayMode}
                    graphVarName={metadata?.graph_var_name}
                    graphVarNames={Object.values(metadata?.var_mapping ?? {})
                      .filter((item) => item.panel === "GRAPH")
                      .map((item) => item.var_name)}
                    traceSteps={mergedTrace}
                    bitmaskMode={bitmaskMode}
                    bitWidth={bitWidth}
                    linearPivots={metadata?.linear_pivots}
                    linearContextVarNames={metadata?.linear_context_var_names}
                    specialVarKinds={metadata?.special_var_kinds}
                    playbackControls={{
                      isPlaying: playback.isPlaying,
                      currentStep: playback.currentStep,
                      totalSteps: mergedTrace.length,
                      playbackSpeed: playback.playbackSpeed,
                      disabled: isRunning || mergedTrace.length === 0,
                      onPrev: () => setCurrentStep(playback.currentStep - 1),
                      onNext: () => setCurrentStep(playback.currentStep + 1),
                      onTogglePlay: () => setPlaying(!playback.isPlaying),
                      onSeek: (step) => setCurrentStep(step),
                      onSpeedChange: (speed) => setSpeed(speed),
                    }}
                  />
                ) : (
                  <GridLinearPanel
                    step={currentStep}
                    traceSteps={mergedTrace}
                    previousStep={previousStep}
                    fallback={isFallback}
                    strategy={effectiveStrategy}
                    bitmaskMode={bitmaskMode}
                    bitWidth={bitWidth}
                    linearPivots={metadata?.linear_pivots}
                    linearContextVarNames={metadata?.linear_context_var_names}
                    linearArrayVarName={linearArrayVarName}
                    playbackControls={{
                      isPlaying: playback.isPlaying,
                      currentStep: playback.currentStep,
                      totalSteps: mergedTrace.length,
                      playbackSpeed: playback.playbackSpeed,
                      disabled: isRunning || mergedTrace.length === 0,
                      onPrev: () => setCurrentStep(playback.currentStep - 1),
                      onNext: () => setCurrentStep(playback.currentStep + 1),
                      onTogglePlay: () => setPlaying(!playback.isPlaying),
                      onSeek: (step) => setCurrentStep(step),
                      onSpeedChange: (speed) => setSpeed(speed),
                    }}
                  />
                )}
              </div>
            </div>
          </section>

          {/* Joint: center-right */}
          <div
            className="w-1 shrink-0 bg-prova-line/70 hover:bg-[#58a6ff]/80 cursor-col-resize transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation();
              dragTypeRef.current = "right";
              dragAnchorRef.current = {
                leftCenterTotal: paneWidths.left + paneWidths.center,
                leftWidth: paneWidths.left,
              };
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="가운데-오른쪽 패널 크기 조절"
          />

          {/* ── Variables + Output/Input ──────────────── */}
          <section
            ref={rightPaneRef}
            className="min-h-0 flex flex-col min-w-0"
            style={{ width: `${paneWidths.right}%` }}
          >
            {/* Debug controls */}
            <div className="shrink-0 border-b border-prova-line bg-[#0f141a] px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                  Debug Controls
                </span>
                <span className="text-[10px] text-prova-muted font-mono">
                  Step {mergedTrace.length > 0 ? playback.currentStep + 1 : 0} /{" "}
                  {mergedTrace.length}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(mergedTrace.length - 1, 0)}
                value={Math.min(
                  playback.currentStep,
                  Math.max(mergedTrace.length - 1, 0),
                )}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                disabled={isRunning || mergedTrace.length === 0}
                className="w-full accent-[#58a6ff] disabled:opacity-40"
              />
              <div className="flex items-center gap-2">
                <button
                  className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-prova-panel text-prova-muted hover:text-white disabled:opacity-30 text-[10px] font-mono"
                  onClick={() => setCurrentStep(playback.currentStep - 1)}
                  disabled={
                    isRunning ||
                    mergedTrace.length === 0 ||
                    playback.currentStep === 0
                  }
                  aria-label="Previous step"
                >
                  Prev
                </button>
                <button
                  className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-prova-panel text-prova-muted hover:text-white disabled:opacity-30 text-[10px] font-mono"
                  onClick={() => setPlaying(!playback.isPlaying)}
                  disabled={isRunning || mergedTrace.length === 0}
                  aria-label={playback.isPlaying ? "Pause" : "Play"}
                >
                  {playback.isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  className={`h-7 px-2 flex items-center justify-center rounded border transition-colors text-[10px] font-mono ${
                    isRunning ||
                    mergedTrace.length === 0 ||
                    playback.currentStep >= mergedTrace.length - 1
                      ? "border-prova-line bg-[#161b22] text-prova-muted opacity-30 cursor-not-allowed"
                      : "border-prova-green/45 bg-[#12301f] text-prova-green hover:bg-[#184329] hover:text-[#7ee787]"
                  }`}
                  onClick={() => setCurrentStep(playback.currentStep + 1)}
                  disabled={
                    isRunning ||
                    mergedTrace.length === 0 ||
                    playback.currentStep >= mergedTrace.length - 1
                  }
                  aria-label="Next step"
                >
                  Next
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-[10px] text-prova-muted">Speed</span>
                  <select
                    className="h-7 rounded border border-prova-line bg-[#161b22] text-[10px] text-[#c9d1d9] px-1 focus:outline-none disabled:opacity-40"
                    value={playback.playbackSpeed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    disabled={isRunning || mergedTrace.length === 0}
                  >
                    <option value={0.5}>×0.5</option>
                    <option value={1}>×1</option>
                    <option value={1.5}>×1.5</option>
                    <option value={2}>×2</option>
                    <option value={10}>×10</option>
                    <option value={20}>×20</option>
                    <option value={100}>×100</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {/* Variable group */}
              <div
                className="min-h-0 flex flex-col"
                style={{ height: `${rightHeights.variable}%` }}
              >
                <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-prova-line bg-[#0f141a]">
                  <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                    Variable Monitor
                  </span>
                  <div className="flex items-center gap-1 text-prova-muted">
                    <button className="hover:text-[#c9d1d9] transition-colors">
                      <IconRefresh />
                    </button>
                    <button className="hover:text-[#c9d1d9] transition-colors ml-1">
                      <IconExpand />
                    </button>
                  </div>
                </div>
                <div className="shrink-0 px-3 py-[6px] bg-[#161b22] border-b border-prova-line">
                  <span className="text-[10px] text-prova-muted font-mono">
                    {currentStep
                      ? `<global> › ${currentStep.scope.func} (depth: ${currentStep.scope.depth})`
                      : "<global> (depth: 0)"}
                  </span>
                </div>
                <div className="flex-1 overflow-auto min-h-0 bg-[#0d1117]">
                  {!currentStep && (
                    <div className="p-4 text-xs text-prova-muted italic">
                      실행 후 변수가 표시됩니다.
                    </div>
                  )}
                  {currentStep &&
                    Object.entries(currentStep.vars).map(([key, value]) => {
                      const changed =
                        previousStep &&
                        JSON.stringify(previousStep.vars[key]) !==
                          JSON.stringify(value);
                      const isKey = metadata?.key_vars.includes(key);
                      return (
                        <div
                          key={key}
                          className={`grid grid-cols-[2fr_3fr] gap-2 px-3 py-[5px] border-b border-[#1c2128] text-xs transition-colors ${
                            changed ? "bg-[#3d2b00]/40" : ""
                          }`}
                        >
                          <span
                            className={`font-mono truncate ${isKey ? "text-prova-green font-semibold" : "text-[#8b949e]"}`}
                          >
                            {key}
                            {changed && (
                              <span className="ml-1 text-[#e3b341]">·</span>
                            )}
                          </span>
                          <span className="font-mono text-[#c9d1d9] truncate">
                            {formatWithBitMode(value, bitmaskMode, bitWidth)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Joint: variable-input */}
              <div
                className="h-1 shrink-0 bg-prova-line/70 hover:bg-[#58a6ff]/80 cursor-row-resize transition-colors"
                onMouseDown={() => {
                  dragTypeRef.current = "var-input";
                  document.body.style.cursor = "row-resize";
                  document.body.style.userSelect = "none";
                }}
                role="separator"
                aria-orientation="horizontal"
                aria-label="변수-입력 패널 크기 조절"
              />

              {/* Input group */}
              <div
                className="min-h-0 flex flex-col"
                style={{ height: `${rightHeights.input}%` }}
              >
                <div className="shrink-0 h-9 flex items-center justify-between px-3 border-y border-prova-line bg-[#0f141a]">
                  <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                    Input
                  </span>
                  <span className="text-[10px] text-prova-muted font-mono">
                    stdin
                  </span>
                </div>
                <div className="flex-1 min-h-0 bg-[#0d1117] p-3">
                  <div className="h-full rounded-md border border-[#30363d] bg-[#161b22] p-3 flex flex-col gap-3">
                    <textarea
                      className="flex-1 min-h-0 rounded border border-prova-line bg-[#0d1117] text-xs font-mono p-2 resize-none placeholder:text-prova-muted focus:outline-none focus:border-[#58a6ff]/60 transition-colors disabled:opacity-40"
                      placeholder="입력값을 작성하세요"
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      disabled={isRunning || pyodideStatus === "error"}
                    />
                    <button
                      className={`shrink-0 h-9 rounded text-xs font-bold tracking-wide transition-colors ${
                        pyodideStatus === "ready" &&
                        !isCodeEmpty &&
                        !isStdinEmpty
                          ? mergedTrace.length > 0
                            ? "bg-[#21262d] border border-prova-line text-[#c9d1d9] hover:bg-[#262c36]"
                            : "bg-prova-green text-black hover:bg-[#4ac763]"
                          : pyodideStatus === "error"
                            ? "bg-[#2d1112] border border-prova-red text-[#f8b4b4]"
                            : "bg-[#21262d] border border-prova-line text-prova-muted cursor-not-allowed"
                      }`}
                      disabled={
                        pyodideStatus !== "ready" || isCodeEmpty || isStdinEmpty
                      }
                      title={
                        isCodeEmpty
                          ? "코드를 입력한 후 디버깅을 시작하세요."
                          : isStdinEmpty
                            ? "예시 입력(stdin)을 입력한 후 디버깅을 시작하세요."
                            : undefined
                      }
                      onClick={() => {
                        if (pyodideStatus !== "ready") return;
                        const runLanguage = detectLanguageFromCode(
                          code,
                          normalizedLanguage,
                        );
                        if (runLanguage !== normalizedLanguage) {
                          setLanguage(runLanguage);
                          addToast(
                            "ok",
                            `코드 패턴을 감지해 ${runLanguage === "javascript" ? "JavaScript" : "Python"}로 전환했습니다. 다시 실행해 주세요.`,
                          );
                          return;
                        }
                        if (isCodeEmpty) {
                          addToast(
                            "warn",
                            "코드를 입력한 후 디버깅을 시작하세요.",
                          );
                          return;
                        }
                        if (isStdinEmpty) {
                          addToast(
                            "warn",
                            "예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.",
                          );
                          return;
                        }
                        try {
                          localStorage.setItem(LAST_EXECUTED_CODE_KEY, code);
                          localStorage.setItem(LAST_EXECUTED_STDIN_KEY, stdin);
                        } catch {
                          // ignore storage failures
                        }
                        codeRef.current = code;
                        resetForRun();
                        setPyodideStatus("running");
                        runtimeRef.current?.run(code, stdin);
                      }}
                    >
                      {runButtonLabel(
                        pyodideStatus,
                        mergedTrace.length > 0,
                        isCodeEmpty,
                        isStdinEmpty,
                        language,
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Joint: input-output */}
              <div
                className="h-1 shrink-0 bg-prova-line/70 hover:bg-[#58a6ff]/80 cursor-row-resize transition-colors"
                onMouseDown={() => {
                  dragTypeRef.current = "input-output";
                  document.body.style.cursor = "row-resize";
                  document.body.style.userSelect = "none";
                }}
                role="separator"
                aria-orientation="horizontal"
                aria-label="입력-출력 패널 크기 조절"
              />

              {/* Output group */}
              <div
                className="min-h-0 flex flex-col"
                style={{ height: `${rightHeights.output}%` }}
              >
                <div className="shrink-0 h-9 flex items-center justify-between px-3 border-y border-prova-line bg-[#0f141a]">
                  <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                    Output
                  </span>
                  <span
                    className={`text-[10px] font-mono ${isError ? "text-prova-red" : "text-prova-muted"}`}
                  >
                    {isError ? "error" : "stdout"}
                  </span>
                </div>
                <div
                  className={`flex-1 overflow-auto min-h-0 p-3 text-xs font-mono leading-5 flex flex-col gap-2 ${
                    isError ? "bg-[#140a0a]" : "bg-[#0d1117]"
                  }`}
                >
                  <div
                    className={`rounded-md border px-3 py-2 overflow-auto ${
                      isError
                        ? "border-prova-red/40 bg-[#12090b] text-[#ffc1c1]"
                        : "border-[#30363d] bg-[#0b1119] text-[#c9d1d9]"
                    }`}
                  >
                    {consoleLines.length === 0 ? (
                      <p className="text-prova-muted"> </p>
                    ) : (
                      consoleLines.map((line, idx) => (
                        <p
                          key={`${line}-${idx}`}
                          className="whitespace-pre-wrap break-words"
                        >
                          {line}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Toasts ──────────────────────────────────────────── */}
      <div className="fixed right-4 bottom-20 w-[340px] flex flex-col gap-2 pointer-events-none z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs shadow-lg ${
              toast.kind === "ok"
                ? "bg-[#0d1f17] border-prova-green text-prova-green"
                : "bg-[#1f1200] border-[#e3b341]/60 text-[#ffe09a]"
            }`}
          >
            <span className="mt-[1px]">{toast.kind === "ok" ? "✓" : "⚠"}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
