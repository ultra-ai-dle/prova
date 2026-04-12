"use client";

import { useState } from "react";
import { LinearPivotSpec, MergedTraceStep } from "@/types/prova";
import { GridIcon } from "@/components/icons";
import { ThreeDVolumePanel } from "@/features/visualization/ThreeDVolumePanel";
import {
  formatLinearAlgoContext,
  pointersAtIndexFromSpecs,
  type LinearPointerMap
} from "@/features/visualization/linearPointerHelpers";
import { formatCellValue } from "@/lib/formatValue";
import { is2DArray, inferBitWidthFromGrid, expand2DBitmaskGridTo3D } from "@/lib/dataDetection";

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

function isScalar(value: unknown) {
  return value == null || ["number", "string", "boolean"].includes(typeof value);
}

function isScalar2DArray(value: unknown): value is unknown[][] {
  return is2DArray(value) && (value as unknown[][]).every((row) => row.every((cell) => isScalar(cell)));
}

function isScalar3DArray(value: unknown): value is unknown[][][] {
  if (!Array.isArray(value) || !Array.isArray(value[0])) return false;
  const asArray = value as unknown[][][];
  if (!Array.isArray(asArray[0]?.[0])) return false;
  // 진짜 3D 배열: 모든 내부 row의 길이가 동일해야 하며 비어있으면 안 됨
  // (파이어볼 board처럼 셀마다 길이가 다른 "2D 그리드 of lists"와 구분)
  const innerLen = asArray[0][0].length;
  if (innerLen === 0) return false;
  return asArray.every(
    (plane) => Array.isArray(plane) && plane.every(
      (row) => Array.isArray(row) && row.length === innerLen && row.every((cell) => isScalar(cell))
    )
  );
}

function getAll3DVars(step: MergedTraceStep): Array<{ name: string; value: unknown[][][] }> {
  const entries = Object.entries(step.vars);
  return entries
    .filter(([, v]) => isScalar3DArray(v))
    .map(([name, v]) => ({ name, value: v as unknown[][][] }));
}

function is2DBitmaskGrid(value: unknown): value is number[][] {
  return is2DArray(value)
    && (value as unknown[][]).every((row) =>
      row.every(
        (cell) => typeof cell === "number" && Number.isInteger(cell) && cell >= 0
      )
    );
}

function getBitmaskGridAs3DVar(step: MergedTraceStep, bitWidth = 1) {
  const entries = Object.entries(step.vars);
  const candidate = entries.find(([, value]) => is2DBitmaskGrid(value));
  if (!candidate) return null;
  const [name, value] = candidate;
  const grid = value as number[][];
  const width = inferBitWidthFromGrid(grid, bitWidth, 64);
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

function getAll2DVars(step: MergedTraceStep): Array<{ name: string; value: unknown[][] }> {
  const entries = Object.entries(step.vars);
  const scalar = entries.filter(([, v]) => isScalar2DArray(v)).map(([name, v]) => ({ name, value: v as unknown[][] }));
  if (scalar.length > 0) return scalar;
  return entries.filter(([, v]) => is2DArray(v)).map(([name, v]) => ({ name, value: v as unknown[][] }));
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
  // 셀 클릭 상세 표시: { gridName, row, col }
  const [selectedCell, setSelectedCell] = useState<{ gridName: string; row: number; col: number } | null>(null);

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
  const gridVars = getAll2DVars(step);
  const previousGridVarMap = previousStep
    ? new Map(getAll2DVars(previousStep).map((g) => [g.name, g.value]))
    : new Map<string, unknown[][]>();
  const native3DVars = getAll3DVars(step);
  const nativePrev3DVarMap = previousStep
    ? new Map(getAll3DVars(previousStep).map((g) => [g.name, g.value]))
    : new Map<string, unknown[][][]>();
  // IMPORTANT: do not infer by variable names; convert only by runtime structure + mode.
  const bitmask3DVar =
    native3DVars.length === 0 && bitmaskMode ? getBitmaskGridAs3DVar(step, bitWidth) : null;
  const bitmaskPrev3DVar =
    native3DVars.length === 0 && bitmaskMode && previousStep ? getBitmaskGridAs3DVar(previousStep, bitWidth) : null;
  const grid3DVars: Array<{ name: string; value: unknown[][][] }> =
    native3DVars.length > 0 ? native3DVars : bitmask3DVar ? [bitmask3DVar] : [];
  const grid3DVar = grid3DVars[0] ?? null;
  const focusIndex = typeof step.vars.nk === "number"
    ? step.vars.nk
    : (typeof step.vars.k === "number" ? step.vars.k : 0);
  // If var_mapping is empty, fall back to indexes_1d_var from linearPivots
  const effectiveLinearVarName =
    linearArrayVarName ?? linearPivots?.find((p) => p.indexes_1d_var)?.indexes_1d_var;
  const linearVar = resolveLinearVar(step, effectiveLinearVarName);
  const shouldRender3D = strategy !== "LINEAR" && strategy !== "GRAPH" && !!grid3DVar;
  const shouldRenderGrid = !shouldRender3D && strategy !== "LINEAR" && strategy !== "GRAPH" && !!gridVar;
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
      {/* 3D Slice Grid(s) */}
      {shouldRender3D && (
        <div className={`flex-1 flex ${grid3DVars.length > 1 ? "flex-row" : "flex-col"} min-h-0`}>
          {grid3DVars.map((gv) => {
            const prevVol = nativePrev3DVarMap.get(gv.name) ?? (bitmaskPrev3DVar?.name === gv.name ? bitmaskPrev3DVar.value : null);
            return (
              <div key={gv.name} className={grid3DVars.length > 1 ? "flex-1 min-w-0 border-r border-prova-line last:border-r-0" : "flex-1 min-h-0"}>
                {grid3DVars.length > 1 && (
                  <div className="px-3 pt-2 pb-0 text-[10px] text-prova-muted font-mono uppercase tracking-widest">
                    {gv.name}
                  </div>
                )}
                <ThreeDVolumePanel
                  name={gv.name}
                  volume={gv.value}
                  prevVolume={prevVol ?? null}
                  traceSteps={traceSteps}
                  focusIndex={focusIndex}
                  bitmaskMode={bitmaskMode}
                  bitWidth={bitWidth}
                  playbackControls={grid3DVars.length > 1 && gv.name !== grid3DVars[0].name ? undefined : playbackControls}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Grid(s) */}
      {shouldRenderGrid && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex items-start justify-center gap-6 p-4 overflow-auto prova-scrollbar flex-wrap">
            {gridVars.map((gv) => {
              const prevGrid = previousGridVarMap.get(gv.name) ?? null;
              const gridCells = toCells(step, gv.value, prevGrid);
              const cols = (gv.value[0] ?? []).length;
              return (
                <div key={gv.name} className="flex flex-col items-center gap-1">
                  {gridVars.length > 1 && (
                    <span className="text-[10px] text-prova-muted font-mono uppercase tracking-widest mb-1">
                      {gv.name}
                    </span>
                  )}
                  <div className="inline-grid gap-[5px]">
                    <div
                      className="grid gap-[5px]"
                      style={{ gridTemplateColumns: `26px repeat(${cols || 1}, 40px)` }}
                    >
                      <div />
                      {Array.from({ length: cols }, (_, c) => (
                        <div key={`col-${c}`} className="text-[10px] text-prova-muted text-center font-mono">
                          x{c}
                        </div>
                      ))}
                      {Array.from({ length: gv.value.length }, (_, r) => (
                        <div key={`row-wrap-${r}`} className="contents">
                          <div className="text-[10px] text-prova-muted text-right pr-1 font-mono self-center">y{r}</div>
                          {Array.from({ length: cols }, (_, c) => {
                            const idx = r * (cols || 1) + c;
                            const cell = gridCells[idx];
                            if (!cell) return <div key={`cell-empty-${r}-${c}`} className="w-10 h-10" />;
                            const cellIsComplex = Array.isArray(cell.value);
                            const isSelected = selectedCell?.gridName === gv.name && selectedCell.row === r && selectedCell.col === c;
                            return (
                              <div
                                key={`cell-${r}-${c}`}
                                onClick={cellIsComplex ? () => setSelectedCell(isSelected ? null : { gridName: gv.name, row: r, col: c }) : undefined}
                                className={`w-10 h-10 rounded-md border grid place-items-center text-sm font-bold transition-all duration-200 ${cellIsComplex ? "cursor-pointer" : ""} ${
                                  isSelected
                                    ? "border-[#f2cc60] bg-[#2d2200] text-[#f2cc60]"
                                    : hasError && cell.isCurrent
                                      ? "border-prova-red bg-[#3d0b0b] text-prova-red"
                                      : cell.isCurrent
                                        ? "border-prova-green bg-[#0d4429] text-prova-green"
                                        : cell.changed
                                          ? "border-[#388bfd] bg-[#1f3555]/70 text-[#9ac7ff]"
                                          : "border-[#21262d] bg-[#161b22] text-[#c9d1d9]"
                                }`}
                              >
                                {cell.isCurrent && !hasError && !isSelected ? "→" : formatCellValue(cell.value, bitmaskMode, bitWidth)}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 셀 상세 패널 */}
          {selectedCell && (() => {
            const gv = gridVars.find((g) => g.name === selectedCell.gridName);
            const cellVal = gv?.value?.[selectedCell.row]?.[selectedCell.col];
            if (cellVal === undefined) return null;
            const label = `${selectedCell.gridName}[${selectedCell.row}][${selectedCell.col}]`;
            return (
              <div className="shrink-0 border-t border-prova-line px-3 py-2 max-h-40 overflow-auto prova-scrollbar">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[#f2cc60] uppercase tracking-widest">{label}</span>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="text-[10px] text-prova-muted hover:text-[#c9d1d9] transition-colors"
                  >✕</button>
                </div>
                <CellDetailView value={cellVal} />
              </div>
            );
          })()}
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

function CellDetailView({ value }: { value: unknown }) {
  if (Array.isArray(value) && value.length === 0) {
    return <span className="text-[11px] font-mono text-prova-muted italic">비어 있음</span>;
  }

  // 2D 배열
  if (Array.isArray(value) && Array.isArray((value as unknown[][])[0])) {
    const grid = value as unknown[][];
    const cols = (grid[0] ?? []).length;
    return (
      <div className="inline-grid gap-[3px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols || 1}, 32px)` }}>
          {grid.map((row, r) =>
            (row as unknown[]).map((cell, c) => (
              <div
                key={`d2-${r}-${c}`}
                className="w-8 h-8 rounded border border-[#21262d] bg-[#161b22] text-[10px] font-mono text-[#c9d1d9] grid place-items-center"
              >
                {JSON.stringify(cell)}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 1D 배열
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {(value as unknown[]).map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-prova-muted font-mono">[{i}]</span>
            <div className="min-w-[32px] h-8 px-1 rounded border border-[#2d4f79] bg-[#11243d] text-[10px] font-mono text-[#c9d1d9] grid place-items-center">
              {typeof item === "object" ? JSON.stringify(item) : String(item)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // scalar
  return (
    <span className="text-[11px] font-mono text-[#c9d1d9]">{JSON.stringify(value)}</span>
  );
}
