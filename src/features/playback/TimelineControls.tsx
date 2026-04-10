"use client";

import { BranchLines, MergedTraceStep } from "@/types/prova";

type Props = {
  steps: MergedTraceStep[];
  branchLines: BranchLines;
  currentStep: number;
  isRunning: boolean;
  isPlaying: boolean;
  speed: number;
  isError: boolean;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onJumpToError: () => void;
};

const IconTarget = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export function TimelineControls({
  steps,
  branchLines,
  currentStep,
  isRunning,
  isPlaying,
  speed,
  isError,
  onStepChange,
  onTogglePlay,
  onSpeedChange,
  onJumpToError
}: Props) {
  const disabled = isRunning || steps.length === 0;
  const hasError = steps.some((s) => s.runtimeError);

  return (
    <section className="shrink-0 border-t border-prova-line bg-[#0d1117]">
      {/* Timeline track */}
      <div className="px-3 pt-2 pb-1">
        <div className="dot-scrollbar flex items-center gap-[3px] overflow-x-auto h-5">
          {steps.length === 0 && (
            <span className="text-[10px] text-prova-muted">타임라인 없음 — 코드를 실행하세요</span>
          )}
          {steps.map((step, index) => {
            const isLoop = branchLines.loop.includes(step.line);
            const isBranch = branchLines.branch.includes(step.line);
            const isCurrent = index === currentStep;
            const isErrDot = step.runtimeError;

            let dotColor = "bg-[#30363d]";
            if (isErrDot) dotColor = "bg-prova-red";
            else if (isLoop) dotColor = "bg-[#388bfd]";
            else if (isBranch) dotColor = "bg-prova-purple";

            return (
              <button
                key={`${step.step}-${step.line}`}
                className={`shrink-0 rounded-full transition-all duration-150 ${dotColor} ${
                  isCurrent
                    ? "w-[10px] h-[10px] ring-2 ring-white/70 ring-offset-1 ring-offset-[#0d1117]"
                    : isBranch
                      ? "w-[7px] h-[7px] rotate-45 rounded-[1px]"
                      : "w-[6px] h-[6px]"
                }`}
                onClick={() => onStepChange(index)}
                aria-label={`step-${index + 1}`}
                disabled={disabled}
              />
            );
          })}
        </div>
      </div>

      {/* Controls row */}
      <div className="h-10 flex items-center justify-between px-3 pb-1">
        {/* Step info */}
        <div className="text-[10px] text-prova-muted font-mono w-24">
          {steps.length > 0
            ? `${currentStep + 1} / ${steps.length}`
            : "—"}
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-[#161b22] text-prova-muted hover:text-white hover:border-[#58a6ff]/40 transition-colors disabled:opacity-30 text-[10px] font-mono"
            onClick={() => onStepChange(currentStep - 1)}
            disabled={disabled || currentStep === 0}
            aria-label="Step back"
          >
            Prev
          </button>

          <button
            className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-[#161b22] text-prova-muted hover:text-white hover:border-prova-green/40 transition-colors disabled:opacity-30 text-[10px] font-mono"
            onClick={onTogglePlay}
            disabled={disabled}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-[#161b22] text-prova-muted hover:text-white hover:border-[#58a6ff]/40 transition-colors disabled:opacity-30 text-[10px] font-mono"
            onClick={() => onStepChange(currentStep + 1)}
            disabled={disabled || currentStep >= steps.length - 1}
            aria-label="Step forward"
          >
            Next
          </button>

          {(isError || hasError) && (
            <button
              className="h-7 w-7 flex items-center justify-center rounded border border-prova-red/40 bg-[#2d1112]/60 text-prova-red hover:bg-[#3d1a1a] transition-colors disabled:opacity-30"
              onClick={onJumpToError}
              disabled={disabled}
              aria-label="Jump to error"
            >
              <IconTarget />
            </button>
          )}
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2 w-24 justify-end">
          <span className="text-[10px] text-prova-muted">Speed</span>
          <select
            className="h-6 rounded border border-prova-line bg-[#161b22] text-[10px] text-[#c9d1d9] px-1 focus:outline-none"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            disabled={disabled}
          >
            <option value={0.5}>×0.5</option>
            <option value={1}>×1</option>
            <option value={1.5}>×1.5</option>
            <option value={2}>×2</option>
          </select>
        </div>
      </div>
    </section>
  );
}
