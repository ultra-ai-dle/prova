"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridLinearPanel } from "@/features/visualization/GridLinearPanel";
import { GraphPanel } from "@/features/visualization/GraphPanel";
import { CallTreePanel } from "@/features/visualization/CallTreePanel";
import { buildCallTree } from "@/features/visualization/callTreeBuilder";
import { AnalyzeMetadata } from "@/types/prova";
import { useProvaStore } from "@/store/useProvaStore";
import { resolveGraphMode } from "@/lib/graphModeInference";
import { normalizeAndDedupeTags } from "@/lib/tagNormalize";
import { GuidedTour } from "@/features/tour/GuidedTour";
import { useTourStore } from "@/features/tour/useTourStore";
import {
  IconFiles,
  IconSettings,
  IconWarning,
  IconMail,
} from "@/components/icons";
import { ContactModal } from "@/components/ContactModal";
import { ExampleGallery } from "@/features/gallery/ExampleGallery";
import { useGallery } from "@/features/gallery/useGallery";
import type { ExampleItem, ExampleVariant } from "@/data/examples";
import { detectLanguageFromCode } from "@/lib/languageDetection";
import {
  lang,
  languageDisplayLabel,
  type SupportedLanguage,
} from "@/lib/language";
import {
  highlightJavaLine,
  highlightJsLine,
  highlightPythonLine,
} from "@/lib/syntaxHighlight";
import { maxNumericAbs, formatWithBitMode } from "@/lib/formatValue";
import {
  lineFromOffset,
  detectIndentSize,
  convertIndent,
} from "@/lib/textUtils";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { usePlaybackTimer } from "@/hooks/usePlaybackTimer";
import { useDragResize } from "@/hooks/useDragResize";
import { useProvaExecution } from "@/hooks/useProvaExecution";
import { TimelineControls } from "@/features/playback/TimelineControls";
import { DebugCodeEditor } from "@/components/DebugCodeEditor";
import { useT } from "@/i18n";
import type { Translations } from "@/i18n";
import { useLocaleStore } from "@/store/useLocaleStore";

/* ── Helpers ─────────────────────────────────────────────── */
function runButtonLabel(
  t: Translations,
  status: string,
  hasTrace: boolean,
  isCodeEmpty: boolean,
  isStdinEmpty: boolean,
  language = "python",
) {
  if (isCodeEmpty) return t.run_enterCode;
  if (isStdinEmpty) return t.run_enterStdin;
  if (status === "loading") {
    if (lang(language).js) return t.run_loadingJs;
    if (lang(language).java) return t.run_loadingJava;
    return t.run_loadingPy;
  }
  if (status === "running") return t.run_running;
  if (status === "reinitializing") return t.run_reinitializing;
  if (status === "error") return t.run_error;
  return hasTrace ? t.run_rerun : t.run_start;
}

const LAST_EXECUTED_CODE_KEY = "prova:lastExecutedCode";
const LAST_EXECUTED_STDIN_KEY = "prova:lastExecutedStdin";
const LAST_SELECTED_LANGUAGE_KEY = "prova:lastSelectedLanguage";
const LAST_LANGUAGE_USER_PINNED_KEY = "prova:lastLanguageUserPinned";


export default function Page() {
  const [code, setCode] = useState("");
  const [lastRunCode, setLastRunCode] = useState<string | null>(null);
  const [tabSize, setTabSize] = useState<2 | 4>(4);
  const [language, setLanguage] = useState<SupportedLanguage>("python");
  /** true면 코드 패턴 추론으로 언어를 바꾸지 않음(드롭다운 선택이 우선) */
  const [languageUserPinned, setLanguageUserPinned] = useState(false);
  const languageUserPinnedRef = useRef(languageUserPinned);
  const [toasts, setToasts] = useState<
    Array<{ id: number; kind: "warn" | "ok"; message: string }>
  >([]);
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const editorHighlightRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const codeRef = useRef(code);
  const [callTreeWidth, setCallTreeWidth] = useState(208);
  const [callTreeOpen, setCallTreeOpen] = useState(true);
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
  const [contactOpen, setContactOpen] = useState(false);
  const t = useT();
  const { locale, setLocale, hydrateFromStorage } = useLocaleStore();

  useEffect(() => {
    hydrateFromStorage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const gallery = useGallery();
  const {
    splitRootRef,
    rightPaneRef,
    dragTypeRef,
    dragAnchorRef,
    callTreeDragAnchorRef,
    CALLTREE_MIN,
    CALLTREE_MAX,
  } = useDragResize({
    setPaneWidths,
    setRightHeights,
    setCallTreeWidth,
    setCallTreeOpen,
  });

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
    resetToReady,
  } = useProvaStore();

  const currentStep = mergedTrace[playback.currentStep] ?? null;
  const previousStep = mergedTrace[playback.currentStep - 1] ?? null;
  const isRunning = pyodideStatus === "running";
  const isFallback = uiMode === "dataExploration";
  const isError = uiMode === "errorStep";
  const isVisualizing = uiMode === "visualizing" || isError || isFallback;
  const isDebugMode = uiMode !== "ready";
  const normalizedLanguage: "python" | "javascript" | "java" = lang(language).js
    ? "javascript"
    : lang(language).java
      ? "java"
      : "python";
  const inferredLanguage = useMemo(
    () =>
      detectLanguageFromCode(
        code,
        lang(language).java
          ? "java"
          : lang(language).js
            ? "javascript"
            : "python",
      ),
    [code, language],
  );
  const isCodeEmpty = code.trim().length === 0;
  const isStdinEmpty = lang(inferredLanguage).py && stdin.trim().length === 0;
  const javaFileName = useMemo(() => {
    if (!lang(language).java) return null;
    const m = code.match(/\bpublic\s+class\s+([A-Za-z_]\w*)/);
    return m?.[1] ? `${m[1]}.java` : "Algorithm.java";
  }, [code, language]);
  const isAnalyzingCode =
    pyodideStatus === "running" && !metadata;
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
  // 함수 호출이 하나라도 있으면 true — 자동 열기 여부에 사용
  const hasCallTree = useMemo(() => {
    if (mergedTrace.length === 0) return false;
    const tree = buildCallTree(mergedTrace);
    return tree.roots.length > 0;
  }, [mergedTrace]);

  // 새 실행 결과가 나왔을 때 콜트리 가시성 자동 결정:
  // 콜트리가 있으면 열고, 없으면 닫는다
  useEffect(() => {
    if (mergedTrace.length === 0) return;
    setCallTreeOpen(hasCallTree);
  }, [mergedTrace, hasCallTree]);

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
  const isTreeHint = useMemo(() => {
    if (!metadata) return false;
    const signals = [
      ...(metadata.tags ?? []),
      ...(metadata.detected_algorithms ?? []),
      metadata.algorithm ?? "",
    ].map((s) => s.toLowerCase());
    return signals.some((s) => /(^|[-_\s])tree($|[-_\s])|^tree$|트리/.test(s));
  }, [metadata]);

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
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageUserPinnedRef.current = languageUserPinned;
  }, [languageUserPinned]);

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
      if (
        savedLanguage === "python" ||
        savedLanguage === "javascript" ||
        savedLanguage === "java"
      ) {
        setLanguage(savedLanguage as SupportedLanguage);
      }
      const pinned = localStorage.getItem(LAST_LANGUAGE_USER_PINNED_KEY);
      if (pinned === "1") setLanguageUserPinned(true);
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
    try {
      localStorage.setItem(
        LAST_LANGUAGE_USER_PINNED_KEY,
        languageUserPinned ? "1" : "0",
      );
    } catch {
      // ignore storage failures
    }
  }, [languageUserPinned]);

  useEffect(() => {
    if (languageUserPinned) return;
    if (isRunning) return;
    if (inferredLanguage === normalizedLanguage) return;
    const timer = setTimeout(() => {
      setLanguage(inferredLanguage);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    inferredLanguage,
    isRunning,
    language,
    normalizedLanguage,
    languageUserPinned,
  ]);

  const applyTabSizeToCode = (nextTabSize: 2 | 4) => {
    if (nextTabSize === tabSize) return;
    setTabSize(nextTabSize);
    setCode(convertIndent(code, tabSize, nextTabSize));
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

  const addToast = useCallback((kind: "warn" | "ok", message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [{ id, kind, message }, ...prev].slice(0, 3));
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
      kind === "ok" ? 4000 : 5000,
    );
  }, []);

  const handleGallerySelect = useCallback(
    (variant: ExampleVariant) => {
      resetToReady();
      setCode(variant.code);
      setStdin(variant.stdin);
      setLanguageUserPinned(false);
      setLanguage(variant.language);
      gallery.close();
    },
    [resetToReady, setStdin, gallery],
  );

  const handleGalleryCardClick = useCallback(
    (example: ExampleItem, variant: ExampleVariant) => {
      if (code.trim() === "") {
        handleGallerySelect(variant);
      } else {
        gallery.requestConfirm(example, variant);
      }
    },
    [code, handleGallerySelect, gallery],
  );

  const { runtimeRef } = useProvaExecution({
    language,
    codeRef,
    languageUserPinnedRef,
    addToast,
    setPyodideStatus,
    setWorkerResult,
    setMetadata,
    setUiMode,
    setGlobalError,
    setCurrentStep,
    setLanguage,
  });

  usePlaybackTimer({
    currentStep: playback.currentStep,
    isPlaying: playback.isPlaying,
    playbackSpeed: playback.playbackSpeed,
    mergedTrace,
    setCurrentStep,
    setPlaying,
    setUiMode,
  });

  useKeyboardNavigation({
    currentStep: playback.currentStep,
    isPlaying: playback.isPlaying,
    traceLength: mergedTrace.length,
    setCurrentStep,
    setPlaying,
  });

  const headerBadge = useMemo(() => {
    if (isRunning) return { text: "", style: "" };
    if (isFallback)
      return {
        text: t.header_badge_fallback,
        style: "border-prova-line text-prova-muted",
      };
    if (metadata?.display_name)
      return { text: "", style: "border-prova-line text-prova-muted" };
    return {
      text: t.header_badge_waiting,
      style: "border-prova-line text-prova-muted",
    };
  }, [isFallback, isRunning, metadata?.display_name, t]);

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
                (lang(language).js
                  ? t.banner_jsInitFailed
                  : lang(language).java
                    ? t.banner_javaConnectFailed
                    : t.banner_pyInitFailed)}
              {isFallback && t.banner_aiFailed}
              {!isFallback &&
                globalError &&
                (globalError.type === "RUNTIME"
                  ? t.banner_runtimeError(globalError.message)
                  : t.banner_aiError(globalError.message))}
            </span>
          </div>
          {pyodideStatus === "error" && (
            <button
              className="border border-current rounded px-3 py-1 hover:bg-white/10 transition-colors"
              onClick={() => window.location.reload()}
            >
              {t.banner_reload}
            </button>
          )}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <header
        data-tour="header"
        className="shrink-0 h-11 bg-[#161b22] border-b border-prova-line flex items-center px-3 gap-4"
      >
        {/* Logo */}
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-bold text-[15px] tracking-tight">
            Frog<span className="text-prova-green">ger</span>
          </span>
          <span className="text-[10px] text-prova-muted font-mono">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
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
          aria-label={t.header_contact}
          title={t.header_contact}
          onClick={() => setContactOpen(true)}
        >
          <IconMail />
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors shrink-0"
          data-tour="gallery"
          aria-label={t.header_gallery}
          title={t.header_gallery}
          onClick={gallery.open}
        >
          <IconFiles />
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors shrink-0"
          aria-label={t.header_guidedTour}
          title={t.header_guidedTour}
          onClick={() => useTourStore.getState().startTour()}
        >
          <IconSettings />
        </button>
        <button
          className="h-7 w-9 flex items-center justify-center rounded border border-prova-line bg-[#21262d] text-[10px] font-mono text-[#c9d1d9] hover:border-[#58a6ff]/40 transition-colors shrink-0"
          aria-label={t.locale_switchTitle}
          title={t.locale_switchTitle}
          onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
        >
          {t.locale_switchTo}
        </button>
      </header>

      {/* ── Contact Modal ──────────────────────────────────── */}
      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        currentCode={code}
        currentStdin={stdin}
      />

      {/* ── Example Gallery Modal ──────────────────────────── */}
      <ExampleGallery
        isOpen={gallery.isOpen}
        selectedCategory={gallery.selectedCategory}
        confirmTarget={gallery.confirmTarget}
        onClose={gallery.close}
        onSelectCategory={gallery.selectCategory}
        onRequestConfirm={handleGalleryCardClick}
        onCancelConfirm={gallery.cancelConfirm}
        onConfirm={() => {
          if (gallery.confirmVariant)
            handleGallerySelect(gallery.confirmVariant);
        }}
      />

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* 3-column main area (resizable) */}
        <div ref={splitRootRef} className="flex-1 flex min-h-0 min-w-0">
          {/* ── Code Editor ───────────────────────────── */}
          <section
            data-tour="editor"
            className="min-h-0 flex flex-col min-w-0 border-l-2 border-l-[#58a6ff]/30"
            style={{ width: `${paneWidths.left}%` }}
          >
            {/* Section header */}
            <div
              className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-prova-line bg-[#0f141a]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium truncate">
                  {lang(language).js
                    ? "algorithm.js"
                    : lang(language).java
                      ? (javaFileName ?? "Algorithm.java")
                      : "algorithm.py"}
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
                  data-tour="language"
                  className="h-7 rounded border border-prova-line bg-[#161b22] text-[11px] text-[#c9d1d9] px-2 focus:outline-none"
                  value={language}
                  onChange={(e) => {
                    setLanguageUserPinned(true);
                    setLanguage(e.target.value as SupportedLanguage);
                  }}
                  aria-label={t.editor_langLabel}
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp" disabled>
                    {t.editor_cppDisabled}
                  </option>
                </select>
                <button
                  className="h-7 px-2 rounded border border-prova-line bg-[#21262d] text-[10px] font-mono text-[#c9d1d9] hover:border-[#58a6ff]/40 transition-colors"
                  onClick={() => applyTabSizeToCode(tabSize === 2 ? 4 : 2)}
                  title={t.editor_tabTitle(tabSize, tabSize === 2 ? 4 : 2)}
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
              {/* Copy / Wrap / Mode overlay buttons */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                {isDebugMode && (
                  <button
                    className="shrink-0 flex items-center gap-1 h-6 px-2 rounded border border-[#58a6ff]/40 bg-[#1a2d4a]/60 text-[#58a6ff] hover:bg-[#1a2d4a] hover:border-[#58a6ff]/70 transition-colors text-[10px] font-medium"
                    onClick={() => {
                      setPlaying(false);
                      setUiMode("ready");
                      requestAnimationFrame(() => editorRef.current?.focus());
                    }}
                    title={t.editor_editMode}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    {t.editor_editMode}
                  </button>
                )}
                <button
                  className={`h-6 w-6 flex items-center justify-center rounded border transition-colors ${
                    wordWrap
                      ? "border-[#58a6ff]/50 bg-[#1a2d4a]/60 text-[#58a6ff]"
                      : "border-prova-line bg-prova-panel/80 text-prova-muted hover:text-[#c9d1d9] hover:border-[#58a6ff]/40"
                  }`}
                  onClick={() => setWordWrap((v) => !v)}
                  title={wordWrap ? t.editor_wordWrapOn : t.editor_wordWrapOff}
                  aria-label={wordWrap ? t.editor_wordWrapOn : t.editor_wordWrapOff}
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
                  title={copied ? t.editor_copied : t.editor_copy}
                  aria-label={t.editor_copy}
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
                          {lang(language).js
                            ? t.editor_placeholderJs
                            : lang(language).java
                              ? t.editor_placeholderJava
                              : t.editor_placeholderPy}
                        </span>
                      </div>
                    ) : (
                      <div className={wordWrap ? undefined : "min-w-max"}>
                        {code.split("\n").map((line, lineIdx) => {
                          const lineNo = lineIdx + 1;
                          const isActiveLine = lineNo === editCursorLine;
                          return (
                            <div
                              key={`edit-line-${lineIdx}`}
                              className={`flex w-full ${isActiveLine ? "bg-[#1a2533]/55 border-l-2 border-[#58a6ff]" : "border-l-2 border-transparent"}`}
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
                                {(lang(language).js
                                  ? highlightJsLine
                                  : lang(language).java
                                    ? highlightJavaLine
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
                        })}
                      </div>
                    )}
                  </div>
                  <textarea
                    ref={editorRef}
                    value={code}
                    onChange={(e) => {
                      undoStackRef.current.push(code);
                      if (undoStackRef.current.length > 200) undoStackRef.current.shift();
                      redoStackRef.current = [];
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
                      if (!editorRef.current) return;
                      const el = editorRef.current;

                      // Undo: Cmd+Z / Ctrl+Z
                      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyZ") {
                        e.preventDefault();
                        if (undoStackRef.current.length === 0) return;
                        redoStackRef.current.push(code);
                        setCode(undoStackRef.current.pop()!);
                        return;
                      }

                      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z
                      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyZ") {
                        e.preventDefault();
                        if (redoStackRef.current.length === 0) return;
                        undoStackRef.current.push(code);
                        setCode(redoStackRef.current.pop()!);
                        return;
                      }

                      // Tab
                      if (e.key === "Tab") {
                        e.preventDefault();
                        undoStackRef.current.push(code);
                        redoStackRef.current = [];
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
                        return;
                      }

                      // Comment toggle: Cmd+/ (Mac) or Ctrl+/ (Windows)
                      if ((e.metaKey || e.ctrlKey) && (e.key === "/" || e.code === "Slash")) {
                        e.preventDefault();
                        undoStackRef.current.push(code);
                        redoStackRef.current = [];
                        const selStart = el.selectionStart;
                        const selEnd = el.selectionEnd;

                        const prefix = lang(language).py ? "# " : "// ";
                        const prefixBase = prefix.trimEnd(); // "#" or "//"

                        const lines = code.split("\n");

                        const lineIdxOf = (offset: number) => {
                          let pos = 0;
                          for (let i = 0; i < lines.length; i++) {
                            pos += lines[i].length + 1;
                            if (pos > offset) return i;
                          }
                          return lines.length - 1;
                        };

                        const firstLine = lineIdxOf(selStart);
                        const lastLine = lineIdxOf(selEnd > selStart ? selEnd - 1 : selEnd);

                        const selectedLines = lines.slice(firstLine, lastLine + 1);
                        const nonEmpty = selectedLines.filter((l) => l.trim().length > 0);
                        const allCommented =
                          nonEmpty.length > 0 &&
                          nonEmpty.every((l) => l.startsWith(prefixBase));

                        const newLines = lines.map((line, i) => {
                          if (i < firstLine || i > lastLine) return line;
                          if (line.trim().length === 0) return line;
                          if (allCommented) {
                            if (line.startsWith(prefix)) return line.slice(prefix.length);
                            return line.slice(prefixBase.length);
                          }
                          if (line.startsWith(prefixBase)) return line;
                          return prefix + line;
                        });

                        const nextValue = newLines.join("\n");
                        setCode(nextValue);
                        setEditCursorLine(lineFromOffset(nextValue, selStart));

                        requestAnimationFrame(() => {
                          const nl = nextValue.split("\n");
                          let lineStart = 0;
                          for (let i = 0; i < firstLine; i++) lineStart += nl[i].length + 1;
                          let lineEnd = lineStart;
                          for (let i = firstLine; i <= lastLine; i++) {
                            lineEnd += nl[i].length;
                            if (i < lastLine) lineEnd += 1;
                          }
                          el.selectionStart = lineStart;
                          el.selectionEnd = lineEnd;
                        });
                        return;
                      }
                    }}
                    className={`absolute inset-0 w-full h-full resize-none prova-scrollbar bg-transparent text-transparent caret-[#c9d1d9] font-mono text-[12px] leading-5 pl-14 pr-3 py-3 box-border outline-none ${wordWrap ? "overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all" : "overflow-auto whitespace-pre"}`}
                    style={{ tabSize }}
                    spellCheck={false}
                  />
                </div>
              ) : (
                <DebugCodeEditor
                  code={code}
                  language={normalizedLanguage}
                  wordWrap={wordWrap}
                  tabSize={tabSize}
                  mergedTrace={mergedTrace}
                  currentStepIndex={playback.currentStep}
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                  setPlaying={setPlaying}
                  isRunning={isRunning}
                />
              )}
            </div>

            {/* Language badge */}
            <div className="shrink-0 px-3 py-2 border-t border-prova-line bg-[#0f141a]">
              <span className="text-[10px] text-prova-muted font-mono">
                {lang(language).js
                  ? t.editor_langBadgeJs
                  : lang(language).java
                    ? t.editor_langBadgeJava
                    : t.editor_langBadgePy}
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
            data-tour="visualization"
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
              {isVisualizing && shouldShowBitToggle && (
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
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-[#0d1117] flex">
              {/* Call Tree panel — always shown when trace exists */}
              {!isAnalyzingCode && mergedTrace.length > 0 && (
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
                        알고리즘 분석 중...
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
                    isTreeHint={isTreeHint}
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
            <div data-tour="debug-controls">
              <TimelineControls
                steps={mergedTrace}
                currentStep={playback.currentStep}
                isRunning={isRunning}
                isPlaying={playback.isPlaying}
                speed={playback.playbackSpeed}
                onStepChange={setCurrentStep}
                onTogglePlay={() => setPlaying(!playback.isPlaying)}
                onSpeedChange={setSpeed}
              />
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {/* Variable group */}
              <div
                data-tour="variables"
                className="min-h-0 flex flex-col"
                style={{ height: `${rightHeights.variable}%` }}
              >
                <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-prova-line bg-[#0f141a]">
                  <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                    {t.variable_label}
                  </span>
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
                      {t.variable_empty}
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
                data-tour="input"
                className="min-h-0 flex flex-col"
                style={{ height: `${rightHeights.input}%` }}
              >
                <div className="shrink-0 h-9 flex items-center justify-between px-3 border-y border-prova-line bg-[#0f141a]">
                  <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                    {t.input_label}
                  </span>
                  <span className="text-[10px] text-prova-muted font-mono">
                    {t.input_stdin}
                  </span>
                </div>
                <div className="flex-1 min-h-0 bg-[#0d1117] p-3">
                  <div className="h-full rounded-md border border-[#30363d] bg-[#161b22] p-3 flex flex-col gap-3">
                    <textarea
                      className="flex-1 min-h-0 rounded border border-prova-line bg-[#0d1117] text-xs font-mono p-2 resize-none placeholder:text-prova-muted focus:outline-none focus:border-[#58a6ff]/60 transition-colors disabled:opacity-40"
                      placeholder={t.input_placeholder}
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      disabled={isRunning || pyodideStatus === "error"}
                    />
                    <button
                      className={`shrink-0 h-9 rounded text-xs font-bold tracking-wide transition-colors ${
                        pyodideStatus === "ready" &&
                        !isCodeEmpty &&
                        !isStdinEmpty
                          ? mergedTrace.length > 0 && code === lastRunCode
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
                          ? t.run_titleNoCode
                          : isStdinEmpty
                            ? t.run_titleNoStdin
                            : undefined
                      }
                      onClick={() => {
                        if (pyodideStatus !== "ready") return;
                        if (!languageUserPinned && !lang(language).java) {
                          const runLanguage = detectLanguageFromCode(
                            code,
                            lang(language).js ? "javascript" : "python",
                          );
                          if (runLanguage !== normalizedLanguage) {
                            setLanguage(runLanguage);
                            addToast(
                              "ok",
                              t.toast_langSwitch(languageDisplayLabel(runLanguage)),
                            );
                            return;
                          }
                        }
                        if (isCodeEmpty) {
                          addToast("warn", t.toast_noCode);
                          return;
                        }
                        if (isStdinEmpty) {
                          addToast("warn", t.toast_noStdin);
                          return;
                        }
                        try {
                          localStorage.setItem(LAST_EXECUTED_CODE_KEY, code);
                          localStorage.setItem(LAST_EXECUTED_STDIN_KEY, stdin);
                        } catch {
                          // ignore storage failures
                        }
                        codeRef.current = code;
                        setLastRunCode(code);
                        resetForRun();
                        setPyodideStatus("running");
                        runtimeRef.current?.run(code, stdin);
                      }}
                    >
                      {runButtonLabel(
                        t,
                        pyodideStatus,
                        mergedTrace.length > 0 && code === lastRunCode,
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
                    {t.output_label}
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

      {/* ── Guided Tour ───────────────────────────────────────── */}
      <GuidedTour />
    </div>
  );
}
