import { useEffect, useRef } from "react";
import { AnalyzeMetadata, AnnotatedStep, RawTraceStep, BranchLines, TraceError } from "@/types/prova";
import { ProvaRuntime } from "@/features/execution/runtime";
import { detectLanguageFromCode } from "@/lib/languageDetection";
import {
  collectUserDeclaredSymbols,
  sanitizeRawTrace,
  sanitizeRawTraceWithAllowlist,
  sanitizeVarTypes,
  sanitizeVarTypesWithAllowlist,
} from "@/lib/traceSanitize";
import { stableStringifyObject } from "@/lib/textUtils";
import { getFromCache, saveToCache } from "@/lib/analyzeCache";

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

export function useProvaExecution({
  language,
  codeRef,
  addToast,
  setPyodideStatus,
  setWorkerResult,
  setMetadata,
  setUiMode,
  setGlobalError,
  setCurrentStep,
  setAnnotated,
  setLanguage,
}: {
  language: string;
  codeRef: React.MutableRefObject<string>;
  addToast: (kind: "warn" | "ok", message: string) => void;
  setPyodideStatus: (status: "loading" | "ready" | "running" | "error" | "reinitializing") => void;
  setWorkerResult: (payload: {
    rawTrace: RawTraceStep[];
    branchLines: BranchLines;
    varTypes: Record<string, string>;
  }) => void;
  setMetadata: (meta: AnalyzeMetadata | null) => void;
  setUiMode: (mode: "ready" | "running" | "visualizing" | "errorStep" | "dataExploration") => void;
  setGlobalError: (error: TraceError | null) => void;
  setCurrentStep: (step: number) => void;
  setAnnotated: (annotated: AnnotatedStep[]) => void;
  setLanguage: (lang: "python" | "javascript") => void;
}) {
  const runtimeRef = useRef<ProvaRuntime | null>(null);
  const analyzeCacheRef = useRef<Map<string, AnalyzeMetadata>>(new Map());
  const analyzeInFlightRef = useRef<Map<string, Promise<AnalyzeMetadata>>>(
    new Map(),
  );

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
    codeRef,
    addToast,
    setCurrentStep,
    setGlobalError,
    setMetadata,
    setPyodideStatus,
    setUiMode,
    setWorkerResult,
    setAnnotated,
    setLanguage,
  ]);

  return { runtimeRef };
}
