"use client";

import { LinearPivotSpec, MergedTraceStep } from "@/types/prova";
import { ThreeDVolumePanel } from "@/features/visualization/ThreeDVolumePanel";
import {
  formatLinearAlgoContext,
  pointersAtIndexFromSpecs,
  type LinearPointerMap
} from "@/features/visualization/linearPointerHelpers";

type Props = {
  step: MergedTraceStep | null;
  traceSteps?: MergedTraceStep[];
  fallback: boolean;
  previousStep: MergedTraceStep | null;
  strategy?: "GRID" | "LINEAR" | "GRID_LINEAR" | "GRAPH";
  bitmaskMode?: boolean;
  bitWidth?: number;
  linearPivots?: LinearPivotSpec[];
  linearContextVarNames?: string[];
  /** var_mapping 등에서 온 1차원 배열 변수명 (없으면 첫 1D 배열로 폴백) */
  linearArrayVarName?: string;
  playbackControls?: {
    isPlaying: boolean;
    currentStep: number;
    totalSteps: number;
    playbackSpeed: number;
    disabled: boolean;
    onPrev: () => void;
    onNext: () => void;
    onTogglePlay: () => void;
    onSeek: (step: number) => void;
    onSpeedChange: (speed: number) => void;
  };
};

function is2DArray(value: unknown): value is unknown[][] {
  return Array.isArray(value) && Array.isArray(value[0]);
}

function isScalar(value: unknown) {
  return value == null || ["number", "string", "boolean"].includes(typeof value);
}

function isScalar2DArray(value: unknown): value is unknown[][] {
  return is2DArray(value) && (value as unknown[][]).every((row) => row.every((cell) => isScalar(cell)));
}

function isScalar3DArray(value: unknown): value is unknown[][][] {
  return Array.isArray(value)
    && Array.isArray(value[0])
    && Array.isArray((value as unknown[][][])[0]?.[0])
    && (value as unknown[][][]).every(
      (plane) => Array.isArray(plane) && plane.every((row) => Array.isArray(row) && row.every((cell) => isScalar(cell)))
    );
}

function getFirst3DVar(step: MergedTraceStep) {
  const entries = Object.entries(step.vars);
  const dpFirst = entries.find(([name, value]) => /dp/i.test(name) && isScalar3DArray(value));
  if (dpFirst) return { name: dpFirst[0], value: dpFirst[1] as unknown[][][] };
  const entry = entries.find(([, value]) => isScalar3DArray(value));
  return entry ? { name: entry[0], value: entry[1] as unknown[][][] } : null;
}

function is2DBitmaskGrid(value: unknown): value is number[][] {
  return is2DArray(value)
    && (value as unknown[][]).every((row) =>
      row.every(
        (cell) => typeof cell === "number" && Number.isInteger(cell) && cell >= 0
      )
    );
}

function bitWidthFromGrid(grid: number[][], fallback = 1, cap = 64) {
  let maxValue = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell > maxValue) maxValue = cell;
    }
  }
  const inferred = maxValue > 0 ? Math.floor(Math.log2(maxValue)) + 1 : 1;
  return Math.max(1, Math.min(cap, Math.max(fallback, inferred)));
}

function expand2DBitmaskGridTo3D(grid: number[][], bits: number): unknown[][][] {
  return grid.map((row) =>
    row.map((mask) =>
      Array.from({ length: bits }, (_, k) => Boolean(mask & (1 << k)))
    )
  );
}

function getBitmaskGridAs3DVar(step: MergedTraceStep, bitWidth = 1) {
  const entries = Object.entries(step.vars);
  const candidate = entries.find(([, value]) => is2DBitmaskGrid(value));
  if (!candidate) return null;
  const [name, value] = candidate;
  const grid = value as number[][];
  const width = bitWidthFromGrid(grid, bitWidth, 64);
  return { name, value: expand2DBitmaskGridTo3D(grid, width) };
}

function getFirst2DVar(step: MergedTraceStep) {
  const entries = Object.entries(step.vars);
  // Prefer grid-like 2D arrays with scalar cells (dp/visited/board).
  const scalarEntry = entries.find(([, value]) => isScalar2DArray(value));
  if (scalarEntry) return { name: scalarEntry[0], value: scalarEntry[1] as unknown[][] };
  const entry = entries.find(([, value]) => is2DArray(value));
  return entry ? { name: entry[0], value: entry[1] as unknown[][] } : null;
}

function getFirstLinearVar(step: MergedTraceStep) {
  const entry = Object.entries(step.vars).find(([, value]) => Array.isArray(value) && !Array.isArray(value[0]));
  return entry ? { name: entry[0], value: entry[1] as unknown[] } : null;
}

function list1DArrayKeys(step: MergedTraceStep): string[] {
  return Object.entries(step.vars)
    .filter(([, value]) => Array.isArray(value) && (value.length === 0 || !Array.isArray((value as unknown[])[0])))
    .map(([k]) => k);
}

function resolveLinearVar(step: MergedTraceStep, preferredName?: string) {
  if (preferredName) {
    const v = step.vars[preferredName];
    if (Array.isArray(v) && (v.length === 0 || !Array.isArray((v as unknown[])[0]))) {
      return { name: preferredName, value: v as unknown[] };
    }
  }
  return getFirstLinearVar(step);
}

function toCells(step: MergedTraceStep, grid: unknown[][], previousGrid?: unknown[][] | null) {
  return grid.flatMap((row, y) =>
    row.map((value, x) => {
      const isCurrent = typeof step.vars.r === "number" && typeof step.vars.c === "number"
        ? step.vars.r === y && step.vars.c === x
        : false;
      const prevValue = previousGrid?.[y]?.[x];
      const changed = previousGrid ? JSON.stringify(prevValue) !== JSON.stringify(value) : false;
      return { value, isCurrent, changed };
    }),
  );
}

function formatCellValue(value: unknown, bitmaskMode = false, bitWidth = 1) {
  if (value == null) return "";
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return `${value.toString(2).padStart(Math.max(1, bitWidth), "0")}`;
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  if (typeof value === "string") return value.length > 8 ? `${value.slice(0, 8)}…` : value;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") return "{...}";
  return String(value);
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

export function GridLinearPanel({
  step,
  traceSteps = [],
  fallback,
  previousStep,
  strategy,
  bitmaskMode = false,
  bitWidth = 1,
  linearPivots,
  linearContextVarNames,
  linearArrayVarName,
  playbackControls
}: Props) {
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

  const gridVar = getFirst2DVar(step);
  const previousGridVar = previousStep ? getFirst2DVar(previousStep) : null;
  const native3DVar = getFirst3DVar(step);
  const nativePrev3DVar = previousStep ? getFirst3DVar(previousStep) : null;
  // IMPORTANT: do not infer by variable names; convert only by runtime structure + mode.
  const bitmask3DVar =
    !native3DVar && bitmaskMode ? getBitmaskGridAs3DVar(step, bitWidth) : null;
  const bitmaskPrev3DVar =
    !native3DVar && bitmaskMode && previousStep ? getBitmaskGridAs3DVar(previousStep, bitWidth) : null;
  const grid3DVar = native3DVar ?? bitmask3DVar;
  const prev3DVar = native3DVar ? nativePrev3DVar : bitmaskPrev3DVar;
  const focusIndex = typeof step.vars.nk === "number"
    ? step.vars.nk
    : (typeof step.vars.k === "number" ? step.vars.k : 0);
  // If var_mapping is empty, fall back to indexes_1d_var from linearPivots
  const effectiveLinearVarName =
    linearArrayVarName ?? linearPivots?.find((p) => p.indexes_1d_var)?.indexes_1d_var;
  const linearVar = resolveLinearVar(step, effectiveLinearVarName);
  const shouldRender3D = strategy !== "LINEAR" && strategy !== "GRAPH" && !!grid3DVar;
  const shouldRenderGrid = !shouldRender3D && strategy !== "LINEAR" && strategy !== "GRAPH" && !!gridVar;
  const cells = shouldRenderGrid
    ? toCells(
      step,
      gridVar.value,
      previousGridVar && previousGridVar.name === gridVar?.name ? previousGridVar.value : null
    )
    : [];
  const queue = linearVar?.value ?? [];
  const vars = step.vars ?? {};
  const oneDKeys = list1DArrayKeys(step);
  const linearPointerMap: LinearPointerMap =
    linearVar && Array.isArray(queue)
      ? pointersAtIndexFromSpecs(linearPivots, vars, linearVar.name, queue.length, oneDKeys)
      : new Map();
  const linearCtx = formatLinearAlgoContext(vars, linearContextVarNames);
  const hasError = !!step.runtimeError;

  if (!shouldRenderGrid && !shouldRender3D && !linearVar) {
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
          {vars.map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-[1fr_2fr] gap-3 border-b border-[#1c2128] px-2 py-[5px] rounded"
            >
              <span className="font-mono truncate text-prova-muted">{key}</span>
              <span className="font-mono text-[#c9d1d9] truncate">{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 3D Slice Grid */}
      {shouldRender3D && grid3DVar && (
        <ThreeDVolumePanel
          name={grid3DVar.name}
          volume={grid3DVar.value}
          prevVolume={prev3DVar && prev3DVar.name === grid3DVar.name ? prev3DVar.value : null}
          traceSteps={traceSteps}
          focusIndex={focusIndex}
          bitmaskMode={bitmaskMode}
          bitWidth={bitWidth}
          playbackControls={playbackControls}
        />
      )}

      {/* Grid */}
      {shouldRenderGrid && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="inline-grid gap-[5px]">
            <div
              className="grid gap-[5px]"
              style={{ gridTemplateColumns: `26px repeat(${(gridVar?.value?.[0] ?? []).length || 1}, 40px)` }}
            >
              <div />
              {Array.from({ length: (gridVar?.value?.[0] ?? []).length || 0 }, (_, c) => (
                <div key={`col-${c}`} className="text-[10px] text-prova-muted text-center font-mono">
                  x{c}
                </div>
              ))}
              {Array.from({ length: gridVar?.value?.length || 0 }, (_, r) => (
                <div key={`row-wrap-${r}`} className="contents">
                  <div className="text-[10px] text-prova-muted text-right pr-1 font-mono self-center">y{r}</div>
                  {Array.from({ length: (gridVar?.value?.[0] ?? []).length || 0 }, (_, c) => {
                    const idx = r * ((gridVar?.value?.[0] ?? []).length || 1) + c;
                    const cell = cells[idx];
                    if (!cell) return <div key={`cell-empty-${r}-${c}`} className="w-10 h-10" />;
                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        className={`w-10 h-10 rounded-md border grid place-items-center text-sm font-bold transition-all duration-200 ${
                          hasError && cell.isCurrent
                            ? "border-prova-red bg-[#3d0b0b] text-prova-red"
                            : cell.isCurrent
                              ? "border-prova-green bg-[#0d4429] text-prova-green"
                              : cell.changed
                                ? "border-[#388bfd] bg-[#1f3555]/70 text-[#9ac7ff]"
                                : "border-[#21262d] bg-[#161b22] text-[#c9d1d9]"
                        }`}
                      >
                        {cell.isCurrent && !hasError ? "→" : formatCellValue(cell.value, bitmaskMode, bitWidth)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Linear array + 투포인터 인덱스 */}
      {!hasError && linearVar && (
        <div className="shrink-0 border-t border-prova-line px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-prova-muted uppercase tracking-widest shrink-0">
              {linearVar.name}
            </span>
            <span className="text-[10px] text-prova-muted font-mono shrink-0">
              {queue.length > 0 ? `${queue.length} cells` : "empty"}
            </span>
          </div>
          {linearCtx ? (
            <div className="text-[10px] font-mono text-[#8fb8e8]/95 rounded border border-[#2d4f79]/40 bg-[#0c141c] px-2 py-1">
              {linearCtx}
            </div>
          ) : null}
          <div className="flex items-start gap-1 overflow-x-auto prova-scrollbar pb-1">
            {queue.length === 0 ? (
              <span className="text-[11px] text-prova-muted italic">배열이 비어 있습니다.</span>
            ) : (
              queue.map((item, i) => {
                const ptrs = linearPointerMap.get(i) ?? [];
                const ring = ptrs[0]?.ringClass ?? "";
                return (
                  <div key={`lin-${i}`} className="flex flex-col items-center gap-0.5 shrink-0 min-w-[34px]">
                    <div className="text-[10px] text-prova-muted font-mono tabular-nums">x{i}</div>
                    <div
                      className={`min-w-8 h-8 px-1 rounded border text-[11px] font-mono grid place-items-center border-[#2d4f79] bg-[#11243d] text-[#c9d1d9] transition-all ${ring}`}
                    >
                      {typeof item === "number" && bitmaskMode && Number.isInteger(item) && item >= 0
                        ? item.toString(2).padStart(Math.max(1, bitWidth), "0")
                        : typeof item === "boolean"
                          ? (item ? "T" : "F")
                        : typeof item === "object"
                          ? JSON.stringify(item)
                          : String(item)}
                    </div>
                    {ptrs.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-0.5 max-w-[52px]">
                        {ptrs.map((p) => (
                          <span
                            key={`${p.varName}-${i}`}
                            title={p.varName}
                            className="text-[8px] font-bold leading-none px-1 py-[1px] rounded border border-white/15 bg-black/35 text-[#e6edf3]"
                          >
                            {p.badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
