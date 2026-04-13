import { useEffect, useRef } from "react";
import { AnalyzeMetadata, RawTraceStep, BranchLines, TraceError } from "@/types/prova";
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
import { lang, type SupportedLanguage } from "@/lib/language";

export function useProvaExecution({
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
}: {
  language: string;
  codeRef: React.MutableRefObject<string>;
  /** true면 실행 후 코드 기반 언어 추론으로 setLanguage 하지 않음 */
  languageUserPinnedRef: React.MutableRefObject<boolean>;
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
  setLanguage: (next: SupportedLanguage) => void;
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
            language as SupportedLanguage,
          );
          if (
            !languageUserPinnedRef.current &&
            analyzeLanguage !== language
          ) {
            setLanguage(analyzeLanguage);
          }
          // 드롭다운 고정 시 실제 실행 언어는 state.language — 감지값과 다를 수 있음
          const pipelineLanguage = languageUserPinnedRef.current
            ? (language as SupportedLanguage)
            : analyzeLanguage;
          const allowlist = collectUserDeclaredSymbols(
            codeRef.current,
            pipelineLanguage,
          );
          const sanitizedRawTrace = sanitizeRawTraceWithAllowlist(
            sanitizeRawTrace(payload.rawTrace ?? [], pipelineLanguage),
            allowlist,
            pipelineLanguage,
          );
          const sanitizedVarTypes = sanitizeVarTypesWithAllowlist(
            sanitizeVarTypes(payload.varTypes ?? {}, pipelineLanguage),
            allowlist,
            pipelineLanguage,
          );
          const sanitizedPayload = {
            ...payload,
            rawTrace: sanitizedRawTrace,
            varTypes: sanitizedVarTypes,
          };
          setWorkerResult(sanitizedPayload);

          // 에러 스텝 감지: AI 분석 전에 먼저 처리
          // → AI 분석 실패 여부와 무관하게 에러 라인 하이라이트 보장
          const errorStepIndex = sanitizedRawTrace.findIndex(
            (step) => step.runtimeError,
          );
          if (errorStepIndex >= 0) {
            setUiMode("errorStep");
            setCurrentStep(errorStepIndex);
            setPyodideStatus("ready");
          }

          try {
            const analyzeKey = `${pipelineLanguage}\n@@\n${codeRef.current}\n@@\n${stableStringifyObject(sanitizedVarTypes)}\n@@\nmeta-v2-partition-pivot`;
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
                      language: pipelineLanguage,
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
            if (errorStepIndex < 0) {
              setUiMode("visualizing");
              setCurrentStep(0);
            }
            setPyodideStatus("ready");
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            if (message.includes("_400")) {
              if (errorStepIndex < 0) setUiMode("ready");
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
            if (errorStepIndex < 0) setUiMode("ready");
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
          if (lang(language).java) {
            setPyodideStatus("ready");
          } else {
            setPyodideStatus("error");
          }
          setGlobalError({ type: "RUNTIME", message: error.message });
        },
        onTimeout: () => {
          if (lang(language).java) {
            setPyodideStatus("ready");
            addToast(
              "warn",
              "실행 시간이 초과되었습니다. 코드를 확인 후 다시 시도해 주세요.",
            );
            return;
          }
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
    setLanguage,
    languageUserPinnedRef,
  ]);

  return { runtimeRef };
}
