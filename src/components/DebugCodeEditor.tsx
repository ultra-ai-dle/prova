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
      <div className={wordWrap ? undefined : "min-w-max"}>
      {code.split("\n").map((line, index) => {
        const lineNo = index + 1;
        const errorLine = currentStep?.runtimeError
          ? (currentStep.runtimeError.line ?? currentStep.line)
          : null;
        const error = errorLine !== null && errorLine === lineNo;
        const active = !error && currentStep?.line === lineNo;
        const executed = lineStepMap.has(lineNo);
        const hitInfo = executed ? getLineHitInfo(lineNo) : null;

        const isMultiHit = active && hitInfo && hitInfo.totalHits > 1;

        return (
          <div
            key={lineNo}
            onClick={executed ? () => handleLineClick(lineNo) : undefined}
            className={`flex items-center w-full font-mono text-[12px] leading-5 transition-colors ${
              error
                ? "bg-[#3d0b0b] border-l-2 border-prova-red"
                : active
                  ? "bg-[#2d3748]/60 border-l-2 border-[#58a6ff]"
                  : "border-l-2 border-transparent"
            } ${executed ? "cursor-pointer hover:bg-[#1c2333]" : "cursor-default"}`}
          >
            {/* 줄 번호 */}
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

            {/* 코드 */}
            <span
              className={`pl-2 ${wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"} ${
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

            {/* 반복 실행 인디케이터: active + multi-hit일 때만 표시 */}
            {isMultiHit && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleLineClick(lineNo);
                }}
                className="ml-auto shrink-0 pl-4 pr-2 select-none cursor-pointer
                  text-[10px] tracking-wider text-[#4a5568] hover:text-[#58a6ff]
                  transition-colors"
              >
                <span className="text-[#58a6ff]/70">{hitInfo.currentHitIndex ?? "·"}</span>
                <span className="mx-[2px] text-[#4a5568]/50">/</span>
                <span>{hitInfo.totalHits}</span>
              </span>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
