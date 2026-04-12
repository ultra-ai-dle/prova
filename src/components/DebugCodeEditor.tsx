import {
  highlightJavaLine,
  highlightJsLine,
  highlightPythonLine,
} from "@/lib/syntaxHighlight";
import type { SupportedLanguage } from "@/lib/language";
import { useLineStepMap } from "@/hooks/useLineStepMap";
import { useLineClick } from "@/hooks/useLineClick";
import type { MergedTraceStep } from "@/types/prova";

interface DebugCodeEditorProps {
  code: string;
  language: SupportedLanguage;
  wordWrap: boolean;
  tabSize: number;
  mergedTrace: MergedTraceStep[];
  currentStepIndex: number;
  currentStep: MergedTraceStep | null;
  setCurrentStep: (step: number) => void;
  setPlaying: (playing: boolean) => void;
  isRunning: boolean;
}

export function DebugCodeEditor({
  code,
  language,
  wordWrap,
  tabSize,
  mergedTrace,
  currentStepIndex,
  currentStep,
  setCurrentStep,
  setPlaying,
  isRunning,
}: DebugCodeEditorProps) {
  const lineStepMap = useLineStepMap(mergedTrace);
  const { handleLineClick, getLineHitInfo } = useLineClick({
    lineStepMap,
    currentStepIndex,
    setCurrentStep,
    setPlaying,
    isDisabled: isRunning,
  });

  const highlightLine =
    language === "javascript"
      ? highlightJsLine
      : language === "java"
        ? highlightJavaLine
        : highlightPythonLine;

  return (
    <div
      className={`box-border h-full p-3 prova-scrollbar ${
        wordWrap ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"
      }`}
    >
      {code.split("\n").map((line, index) => {
        const lineNo = index + 1;
        const errorLine = currentStep?.runtimeError
          ? (currentStep.runtimeError.line ?? currentStep.line)
          : null;
        const error = errorLine !== null && errorLine === lineNo;
        const active = !error && currentStep?.line === lineNo;
        const executed = lineStepMap.has(lineNo);
        const hitInfo = executed ? getLineHitInfo(lineNo) : null;

        // 도트 상태 결정
        let dotClass = "";
        if (executed) {
          if (error) {
            dotClass = "bg-[#f85149]";
          } else if (active) {
            dotClass = "bg-[#58a6ff]";
          } else {
            // 이미 실행 vs 아직 미실행 판별
            const steps = lineStepMap.get(lineNo)!;
            const hasVisited = steps.some((s) => s <= currentStepIndex);
            dotClass = hasVisited ? "bg-[#58a6ff]/50" : "bg-[#58a6ff]/25";
          }
        }

        return (
          <div
            key={lineNo}
            onClick={executed ? () => handleLineClick(lineNo) : undefined}
            className={`flex items-center font-mono text-[12px] leading-5 transition-colors ${
              error
                ? "bg-[#3d0b0b] border-l-2 border-prova-red"
                : active
                  ? "bg-[#2d3748]/60 border-l-2 border-[#58a6ff]"
                  : "border-l-2 border-transparent"
            } ${executed ? "cursor-pointer hover:bg-[#1c2333]" : "cursor-default"}`}
            title={
              hitInfo && hitInfo.totalHits > 1
                ? `×${hitInfo.totalHits}`
                : active && hitInfo && hitInfo.totalHits === 1
                  ? "current"
                  : undefined
            }
          >
            {/* 실행 도트: trace에 등장한 모든 라인에 항상 표시 */}
            <span className="w-3 shrink-0 flex items-center justify-center">
              {hitInfo && (
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`}
                />
              )}
            </span>

            {/* 줄 번호 */}
            <span
              className={`w-9 shrink-0 text-right pr-2 select-none text-[11px] leading-5 ${
                active
                  ? error
                    ? "text-prova-red"
                    : "text-[#58a6ff]"
                  : "text-[#4a5568]"
              }`}
            >
              {lineNo}
            </span>

            {/* 코드 */}
            <span
              className={`pl-1 ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"} ${
                active && !error ? "text-white" : ""
              }`}
              style={{ tabSize }}
            >
              {highlightLine(line).map((token, idx) => (
                <span key={`${lineNo}-${idx}`} className={token.className}>
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
