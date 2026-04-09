"use client";

import { MergedTraceStep } from "@/types/prova";

type Props = {
  step: MergedTraceStep | null;
  fallback: boolean;
  previousStep: MergedTraceStep | null;
};

function toCells(step: MergedTraceStep) {
  const visited = (step.vars.visited as boolean[][] | undefined) ?? [];
  return visited.flatMap((row, y) =>
    row.map((value, x) => {
      const isCurrent = step.vars.r === y && step.vars.c === x;
      const isWall = (x === 1 && y === 0) || (x === 2 && y === 3);
      return { value, isCurrent, isWall };
    }),
  );
}

const GridIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-[#30363d]"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export function GridLinearPanel({ step, fallback, previousStep }: Props) {
  if (!step) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-4">
        <GridIcon />
        <div>
          <p className="text-sm text-[#c9d1d9] mb-2 font-medium">
            Visualization will appear here after execution
          </p>
          <p className="text-xs text-prova-muted leading-relaxed">
            Automatically detects <span className="text-[#58a6ff]">BFS</span>,{" "}
            <span className="text-[#58a6ff]">DFS</span>,{" "}
            <span className="text-[#58a6ff]">Stacks</span>,{" "}
            <span className="text-[#58a6ff]">Queues</span>, and Grid traversals.
          </p>
        </div>
      </div>
    );
  }

  if (fallback) {
    const vars = Object.entries(step.vars);
    return (
      <div className="h-full overflow-auto p-4 text-xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-prova-muted uppercase tracking-widest">
            Variable State
          </span>
          <span className="text-[10px] text-prova-muted font-mono">
            — Step {step.step + 1}
          </span>
        </div>
        <div className="space-y-[2px]">
          {vars.map(([key, value]) => {
            const changed =
              previousStep &&
              JSON.stringify(previousStep.vars[key]) !== JSON.stringify(value);
            return (
              <div
                key={key}
                className={`grid grid-cols-[1fr_2fr] gap-3 border-b border-[#1c2128] px-2 py-[5px] rounded transition-colors ${
                  changed ? "bg-[#3d2b00]/40" : "hover:bg-[#161b22]"
                }`}
              >
                <span
                  className={`font-mono truncate ${changed ? "text-[#e3b341]" : "text-prova-muted"}`}
                >
                  {key}
                </span>
                <span className="font-mono text-[#c9d1d9] truncate">
                  {JSON.stringify(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const cells = toCells(step);
  const queue = (step.vars.queue as Array<[number, number]> | undefined) ?? [];
  const hasError = !!step.runtimeError;

  return (
    <div className="h-full flex flex-col">
      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-5 gap-[5px]">
          {cells.map((cell, idx) => (
            <div
              key={idx}
              className={`w-14 h-14 rounded-md border grid place-items-center text-sm font-bold transition-all duration-200 ${
                cell.isWall
                  ? "border-[#30363d] bg-[#21262d]"
                  : hasError && cell.isCurrent
                    ? "border-prova-red bg-[#3d0b0b] text-prova-red shadow-[0_0_12px_rgba(218,54,51,0.4)]"
                    : cell.isCurrent
                      ? "border-prova-green bg-[#0d4429] text-prova-green shadow-[0_0_12px_rgba(63,185,80,0.3)]"
                      : cell.value
                        ? "border-[#1f5c3a] bg-[#0d3321] text-[#4ac763]"
                        : "border-[#21262d] bg-[#161b22]"
              }`}
            >
              {cell.isCurrent ? (hasError ? "✕" : "→") : cell.value ? "✓" : ""}
            </div>
          ))}
        </div>
      </div>

      {/* Error label */}
      {hasError && step.runtimeError && (
        <div className="shrink-0 mx-4 mb-2 px-3 py-2 rounded border border-prova-red/40 bg-[#2d1112]/60 text-xs flex items-center gap-2">
          <span className="text-prova-red font-bold">✕</span>
          <span className="text-[#fca5a5]">
            {typeof step.runtimeError === "string"
              ? step.runtimeError
              : "Runtime error occurred"}
          </span>
        </div>
      )}

      {/* Queue display */}
      {!hasError && (
        <div className="shrink-0 border-t border-prova-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-prova-muted uppercase tracking-widest shrink-0">
              Execution Queue
            </span>
            <span className="text-[10px] text-prova-muted font-mono shrink-0">
              {queue.length > 0
                ? `${queue.length} item${queue.length > 1 ? "s" : ""}`
                : "empty"}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-2 overflow-x-auto dot-scrollbar pb-1">
            {queue.length === 0 && (
              <span className="text-[11px] text-prova-muted italic">
                Queue is empty
              </span>
            )}
            {queue.map((item, i) => (
              <span
                key={`${item[0]}-${item[1]}-${i}`}
                className={`shrink-0 inline-flex items-center rounded border px-2 py-[3px] text-[11px] font-mono transition-all ${
                  i === 0
                    ? "border-prova-green/60 bg-[#0d4429]/60 text-prova-green"
                    : "border-[#388bfd]/40 bg-[#1f3555]/60 text-[#79c0ff]"
                }`}
              >
                ({item[0]},{item[1]})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
