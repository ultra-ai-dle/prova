"use client";

import { useMemo } from "react";
import type { MergedTraceStep } from "@/types/prova";
import { IconBug } from "@/components/icons";
import { useT } from "@/i18n";

type Props = {
  steps: MergedTraceStep[];
  currentStep: number;
  isRunning: boolean;
  isPlaying: boolean;
  speed: number;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
};

export function TimelineControls({
  steps,
  currentStep,
  isRunning,
  isPlaying,
  speed,
  onStepChange,
  onTogglePlay,
  onSpeedChange,
}: Props) {
  const t = useT();
  const disabled = isRunning || steps.length === 0;
  const atStart = disabled || currentStep === 0;
  const atEnd = disabled || currentStep >= steps.length - 1;

  const errorStepIndex = useMemo(
    () => steps.findIndex((s) => s.runtimeError),
    [steps],
  );

  return (
    <div className="shrink-0 border-b border-prova-line bg-[#0f141a] px-3 py-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
          {t.timeline_label}
        </span>
        <span className="text-[10px] text-prova-muted font-mono">
          {t.timeline_step(steps.length > 0 ? currentStep + 1 : 0, steps.length)}
        </span>
      </div>

      {/* Range slider */}
      <input
        type="range"
        min={0}
        max={Math.max(steps.length - 1, 0)}
        value={Math.min(currentStep, Math.max(steps.length - 1, 0))}
        onChange={(e) => onStepChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-[#58a6ff] disabled:opacity-40"
      />

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-prova-panel text-prova-muted hover:text-white disabled:opacity-30 text-[10px] font-mono"
          onClick={() => onStepChange(currentStep - 1)}
          disabled={atStart}
          aria-label={t.timeline_prev}
        >
          {t.timeline_prev}
        </button>
        <button
          className="h-7 px-2 flex items-center justify-center rounded border border-prova-line bg-prova-panel text-prova-muted hover:text-white disabled:opacity-30 text-[10px] font-mono"
          onClick={onTogglePlay}
          disabled={disabled}
          aria-label={isPlaying ? t.timeline_pause : t.timeline_play}
        >
          {isPlaying ? t.timeline_pause : t.timeline_play}
        </button>
        <button
          className={`h-7 px-2 flex items-center justify-center rounded border transition-colors text-[10px] font-mono ${
            atEnd
              ? "border-prova-line bg-[#161b22] text-prova-muted opacity-30 cursor-not-allowed"
              : "border-prova-green/45 bg-[#12301f] text-prova-green hover:bg-[#184329] hover:text-[#7ee787]"
          }`}
          onClick={() => onStepChange(currentStep + 1)}
          disabled={atEnd}
          aria-label={t.timeline_next}
        >
          {t.timeline_next}
        </button>

        {errorStepIndex >= 0 && (
          <button
            className="h-7 w-7 flex items-center justify-center rounded border border-prova-red/40 bg-[#2d1112]/60 text-prova-red hover:bg-[#3d1a1a] transition-colors disabled:opacity-30"
            onClick={() => onStepChange(errorStepIndex)}
            disabled={disabled}
            aria-label={t.timeline_jumpToError}
            title={t.timeline_jumpToError}
          >
            <IconBug />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] text-prova-muted">{t.timeline_speed}</span>
          <select
            className="h-7 rounded border border-prova-line bg-[#161b22] text-[10px] text-[#c9d1d9] px-1 focus:outline-none disabled:opacity-40"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            disabled={disabled}
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
  );
}
