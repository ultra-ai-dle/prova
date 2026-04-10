"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { LinearPivotSpec, MergedTraceStep } from "@/types/prova";
import { ThreeDVolumePanel } from "@/features/visualization/ThreeDVolumePanel";
import {
  formatLinearAlgoContext,
  pointersAtIndexFromSpecs,
  type LinearPointerMap
} from "@/features/visualization/linearPointerHelpers";

type Props = {
  step: MergedTraceStep | null;
  graphVarName?: string;
  graphVarNames?: string[];
  traceSteps?: MergedTraceStep[];
  graphMode?: "directed" | "undirected";
  bitmaskMode?: boolean;
  bitWidth?: number;
  /** AI 분석: 선형 인덱스(투포인터 등) — 클라이언트는 이름 추측하지 않음 */
  linearPivots?: LinearPivotSpec[];
  linearContextVarNames?: string[];
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

type GraphNode = { id: string; label: string };
type GraphLink = { source: string; target: string; weight?: string };
type SimNode = GraphNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode> & { weight?: string };
type GraphStepState = {
  visitedNodes: Set<string>;
  frontierNodes: Set<string>;
  currentNode: string | null;
  activeEdge: { source: string; target: string } | null;
  /** 위상정렬 등 출력 순서 (노드 id) */
  resultOrder: string[];
  orderedNodes: Set<string>;
};

type LinkVisual = { stroke: string; width: number; dash: string; opacity: number };

function linkStyleForStep(st: GraphStepState, s: string, t: string): LinkVisual {
  const active =
    st.activeEdge !== null && st.activeEdge.source === s && st.activeEdge.target === t;
  if (active) {
    return { stroke: "#fcd34d", width: 3.4, dash: "0", opacity: 1 };
  }
  if (st.resultOrder.length > 0) {
    const is = st.resultOrder.indexOf(s);
    const it = st.resultOrder.indexOf(t);
    const sIn = is >= 0;
    const tIn = it >= 0;
    if (sIn && tIn && is < it) {
      return { stroke: "#2dd4bf", width: 2.85, dash: "0", opacity: 0.96 };
    }
    if (sIn && !tIn) {
      return { stroke: "#a78bfa", width: 2.25, dash: "5 4", opacity: 0.78 };
    }
    if (!sIn && tIn) {
      return { stroke: "#64748b", width: 1.85, dash: "3 5", opacity: 0.48 };
    }
    return { stroke: "#8fb8e8", width: 2.05, dash: "4 4", opacity: 0.62 };
  }
  const bothVisited = st.visitedNodes.has(s) && st.visitedNodes.has(t);
  if (bothVisited) {
    return { stroke: "#58d68d", width: 2.75, dash: "0", opacity: 0.92 };
  }
  return { stroke: "#8fb8e8", width: 2.1, dash: "4 4", opacity: 0.72 };
}

function nodePalette(st: GraphStepState, id: string): { fill: string; stroke: string; sw: number } {
  if (st.currentNode === id) return { fill: "#4a3512", stroke: "#f2cc60", sw: 2.85 };
  if (st.frontierNodes.has(id)) return { fill: "#2f1f4f", stroke: "#b28cff", sw: 2.25 };
  if (st.orderedNodes.has(id)) return { fill: "#134e4a", stroke: "#5eead4", sw: 2.35 };
  if (st.visitedNodes.has(id)) return { fill: "#113a2b", stroke: "#58d68d", sw: 2.2 };
  return { fill: "#1b2b42", stroke: "#85c2ff", sw: 2.1 };
}

const GRAPH_NODE_R = 17;

function shortenEdgeEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r1: number,
  r2: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len < 1e-6) {
    return { x1, y1, x2, y2 };
  }
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * r1,
    y1: y1 + uy * r1,
    x2: x2 - ux * r2,
    y2: y2 - uy * r2
  };
}

function svgSafeId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function GraphLegendOverlay({
  graphMode,
  hasResultOrder
}: {
  graphMode: "directed" | "undirected";
  hasResultOrder: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[min(96%,17rem)] rounded border border-white/10 bg-[#070a0e]/82 px-2 py-1.5 text-[9px] leading-snug text-[#b4bcc8] shadow-md backdrop-blur-[3px]"
      aria-label="그래프 범례: 정점 대기·출력·방문, 간선 활성·순서·부분·방문·기타"
    >
      {graphMode === "directed" ? (
        <div className="mb-1 text-[8px] text-[#6d7684]">→ 끝 = to</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[#5a6370]">정점</span>
        <span title="현재" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#f2cc60] bg-[#4a3512]" />
        <span className="inline-flex items-center gap-0.5">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-[#b28cff] bg-[#2f1f4f]" />
          대기
        </span>
        <span className="inline-flex items-center gap-0.5">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-[#5eead4] bg-[#134e4a]" />
          출력
        </span>
        <span className="inline-flex items-center gap-0.5">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-[#58d68d] bg-[#113a2b]" />
          방문
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-white/10 pt-1">
        <span className="text-[#5a6370]">간선</span>
        <span className="inline-flex items-center gap-0.5">
          <span className="inline-block h-[3px] w-3.5 shrink-0 rounded-full bg-[#fcd34d]" />
          활성
        </span>
        {hasResultOrder ? (
          <>
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-block h-[2px] w-3.5 shrink-0 rounded-full bg-[#2dd4bf]" />
              순서
            </span>
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-block w-3.5 shrink-0 border-t-2 border-dotted border-[#a78bfa]" style={{ height: 0 }} />
              부분
            </span>
          </>
        ) : null}
        <span className="inline-flex items-center gap-0.5">
          <span className="inline-block h-[2px] w-3.5 shrink-0 rounded-full bg-[#58d68d]" />
          방문
        </span>
        <span className="inline-flex items-center gap-0.5">
          <span className="inline-block w-3.5 shrink-0 border-t border-dashed border-[#8fb8e8]" style={{ height: 0 }} />
          기타
        </span>
      </div>
    </div>
  );
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toNodeId(value: unknown): string | null {
  const n = toFiniteNumber(value);
  if (n !== null) return String(Math.trunc(n));
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

function pushVisitedFromValue(out: Set<string>, value: unknown) {
  if (Array.isArray(value)) {
    // visited[i] = bool/0/1 pattern
    if (value.every((v) => typeof v === "boolean" || toFiniteNumber(v) !== null)) {
      value.forEach((v, i) => {
        const num = toFiniteNumber(v);
        const isVisited = typeof v === "boolean" ? v : !!(num && num !== 0);
        if (isVisited) out.add(String(i));
      });
      return;
    }
    value.forEach((v) => {
      const id = toNodeId(v);
      if (id !== null) out.add(id);
    });
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      const num = toFiniteNumber(v);
      const isVisited = typeof v === "boolean" ? v : !!(num && num !== 0);
      if (isVisited) out.add(k);
    });
  }
}

function extractResultOrder(vars: Record<string, unknown>): string[] {
  const keys = [
    "result",
    "order",
    "answer",
    "topsort",
    "topo_order",
    "topological_order",
    "topo",
    "ts",
    "sorted",
    "res",
    "ans"
  ];
  for (const k of keys) {
    const v = vars[k];
    if (!Array.isArray(v)) continue;
    const out: string[] = [];
    for (const item of v) {
      const id = toNodeId(item);
      if (id !== null) out.push(id);
    }
    if (out.length > 0) return out;
  }
  return [];
}

function deriveGraphStepState(vars: Record<string, unknown>): GraphStepState {
  const visitedNodes = new Set<string>();
  const frontierNodes = new Set<string>();
  let currentNode: string | null = null;
  let activeEdge: { source: string; target: string } | null = null;

  Object.entries(vars).forEach(([name, value]) => {
    if (/visited|seen|check|marked|used|in_mst/i.test(name)) {
      pushVisitedFromValue(visitedNodes, value);
    }
  });

  const resultOrder = extractResultOrder(vars);
  const orderedNodes = new Set(resultOrder);

  const currentCandidates = ["now_v", "cur", "current", "node", "u", "v", "here"];
  for (const key of currentCandidates) {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const id = toNodeId(vars[key]);
      if (id !== null) {
        currentNode = id;
        break;
      }
    }
  }

  const frontierKeys = ["hq", "pq", "pqueue", "queue", "q", "stack", "st"];
  frontierKeys.forEach((k) => {
    const value = vars[k];
    if (!Array.isArray(value)) return;
    value.forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        // [dist, node] or [cost, to] or [indeg, node]
        const id = toNodeId(item[1]);
        if (id !== null) frontierNodes.add(id);
      } else {
        const id = toNodeId(item);
        if (id !== null) frontierNodes.add(id);
      }
    });
  });

  const nextRaw = vars.next_v;
  if (currentNode && Array.isArray(nextRaw) && nextRaw.length >= 2) {
    const maybeTo = toNodeId(nextRaw[1]);
    if (maybeTo !== null) activeEdge = { source: currentNode, target: maybeTo };
  }
  if (!activeEdge && currentNode) {
    const neighborKeys = ["nxt", "neighbor", "next", "nbr", "nv"];
    for (const nk of neighborKeys) {
      if (!Object.prototype.hasOwnProperty.call(vars, nk)) continue;
      const tid = toNodeId(vars[nk]);
      if (tid !== null) {
        activeEdge = { source: currentNode, target: tid };
        break;
      }
    }
  }
  if (!activeEdge) {
    const s = toNodeId(vars.now_v ?? vars.u ?? vars.v1);
    const t = toNodeId(vars.to ?? vars.v2);
    if (s !== null && t !== null) activeEdge = { source: s, target: t };
  }
  if (!activeEdge) {
    const u0 = toNodeId(vars.u);
    const v0 = toNodeId(vars.v);
    if (u0 !== null && v0 !== null) activeEdge = { source: u0, target: v0 };
  }

  return {
    visitedNodes,
    frontierNodes,
    currentNode,
    activeEdge,
    resultOrder,
    orderedNodes
  };
}

function getSimLinkEndId(end: string | number | SimNode): string {
  if (typeof end === "string" || typeof end === "number") return String(end);
  return end.id;
}

function topologySignature(graph: { nodes: GraphNode[]; links: GraphLink[] }) {
  const ns = graph.nodes.map((n) => n.id).sort().join(",");
  const ls = graph.links
    .map((l) => `${l.source}->${l.target}:${l.weight ?? ""}`)
    .sort()
    .join("|");
  return `${ns}__${ls}`;
}

function is2DArray(value: unknown): value is unknown[][] {
  return Array.isArray(value) && Array.isArray(value[0]);
}
function is1DArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && !Array.isArray(value[0]);
}
function to2D(value: unknown): unknown[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (Array.isArray(row) ? row : [row]));
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function formatScalar(value: unknown, bitmaskMode = false, bitWidth = 1) {
  if (value == null) return "null";
  if (value === "True" || value === "true") return "T";
  if (value === "False" || value === "false") return "F";
  if (typeof value === "string") return value.length > 26 ? `${value.slice(0, 26)}…` : value;
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return value.toString(2).padStart(Math.max(1, bitWidth), "0");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  return String(value);
}
function formatCompact(value: unknown, bitmaskMode = false, bitWidth = 1) {
  if (Array.isArray(value)) return `[${value.length}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).length}}`;
  return formatScalar(value, bitmaskMode, bitWidth);
}
function toJsonLike(value: unknown, depth = 0, bitmaskMode = false, bitWidth = 1): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);
  if (value == null) return "null";
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return value.toString(2).padStart(Math.max(1, bitWidth), "0");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.slice(0, 16).map((v) => `${nextIndent}${toJsonLike(v, depth + 1, bitmaskMode, bitWidth)}`);
    const tail = value.length > 16 ? `${nextIndent}"...(+${value.length - 16})"` : "";
    return `[\n${[...items, ...(tail ? [tail] : [])].join(",\n")}\n${indent}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const rows = entries.slice(0, 24).map(
      ([k, v]) => `${nextIndent}${JSON.stringify(k)}: ${toJsonLike(v, depth + 1, bitmaskMode, bitWidth)}`
    );
    if (entries.length > 24) rows.push(`${nextIndent}"...": "+${entries.length - 24} keys"`);
    return `{\n${rows.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(String(value));
}
function toJsonCompact(value: unknown, bitmaskMode = false, bitWidth = 1): string {
  if (value == null) return "null";
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return value.toString(2).padStart(Math.max(1, bitWidth), "0");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => toJsonCompact(v, bitmaskMode, bitWidth)).join(", ")}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${toJsonCompact(v, bitmaskMode, bitWidth)}`).join(", ")} }`;
  }
  return JSON.stringify(String(value));
}
function toJsonPreferSingleLine(value: unknown, maxLen = 120, bitmaskMode = false, bitWidth = 1): string {
  const oneLine = toJsonCompact(value, bitmaskMode, bitWidth);
  if (oneLine.length <= maxLen) return oneLine;
  return toJsonLike(value, 0, bitmaskMode, bitWidth);
}
function toNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
function getPositiveMaxInGrid(grid: unknown[][]): number {
  let maxVal = 1;
  grid.forEach((row) => {
    row.forEach((cell) => {
      const n = toNumeric(cell);
      if (n !== null && n > 0) maxVal = Math.max(maxVal, n);
    });
  });
  return maxVal;
}
function getGridCellTone(value: unknown, positiveMax: number) {
  const isFalsy = value == null || value === "" || value === false || value === 0;
  const n = toNumeric(value);
  if (n !== null && n < 0) {
    return "border-[#7f3b3b] bg-[#3a1919] text-[#ffb4b4]";
  }
  if (isFalsy || n === 0 || n === null) {
    return "border-[#2a2f36] bg-[#161b22] text-[#8b949e]";
  }
  const ratio = Math.max(0, Math.min(1, n / Math.max(positiveMax, 1)));
  const stage = Math.max(1, Math.min(10, Math.ceil(ratio * 10)));
  const blueStage: Record<number, string> = {
    1: "border-[#2e4f77] bg-[#10243a] text-[#8fbde6]",
    2: "border-[#31557f] bg-[#112843] text-[#93c1e9]",
    3: "border-[#355b88] bg-[#122d4a] text-[#98c6ec]",
    4: "border-[#386191] bg-[#143252] text-[#9ecbf0]",
    5: "border-[#3c6799] bg-[#15365a] text-[#a4d0f3]",
    6: "border-[#406ea2] bg-[#173b62] text-[#aad5f6]",
    7: "border-[#4474ab] bg-[#18406a] text-[#afdafa]",
    8: "border-[#487ab3] bg-[#1a4472] text-[#b6defd]",
    9: "border-[#4b81bc] bg-[#1b497a] text-[#c0e4ff]",
    10: "border-[#5087c4] bg-[#1d4e83] text-[#cce9ff]",
  };
  return blueStage[stage];
}

/**
 * 숫자/스칼라로 채운 2차원 표(DP, 비용행렬, visited 등). 인접 리스트와 구분해 그리드로 본다.
 * 인접 리스트는 일부 정점이 []라 minLen===0이 되므로, 그 경우는 그리드로 보지 않는다.
 */
function looksLike2DScalarTableGrid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row))) return false;
  const rows = value as unknown[][];
  const lens = rows.map((r) => r.length);
  const minLen = Math.min(...lens);
  const maxLen = Math.max(...lens);
  if (maxLen === 0) return false;
  if (minLen === 0) return false;
  if (maxLen - minLen > 4) return false;
  const flat = rows.flat();
  const scalars = flat.filter((v) => v == null || ["number", "string", "boolean"].includes(typeof v)).length;
  return scalars / flat.length >= 0.82;
}

/**
 * 미로·맵·보드 등 2차원 격자(타일 문자/숫자). looksLike2DScalarTableGrid보다 완화해
 * 행 길이가 약간 들쭉날쭉해도 GRAPHLIKE(인접리스트 오인)로 가지 않게 한다.
 */
function is2DRectangularCellGrid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row))) return false;
  const rows = value as unknown[][];
  const lens = rows.map((r) => r.length);
  const minLen = Math.min(...lens);
  const maxLen = Math.max(...lens);
  if (minLen === 0) return false;
  if (maxLen - minLen > 8) return false;
  const flat = rows.flat();
  if (flat.length === 0) return false;
  const scalars = flat.filter((v) => v == null || ["number", "string", "boolean"].includes(typeof v)).length;
  return scalars / flat.length >= 0.68;
}

function detectGraphLike(value: unknown) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    if (!value.every((row) => Array.isArray(row))) return false;
    if (looksLike2DScalarTableGrid(value)) return false;
    if (is2DRectangularCellGrid(value)) return false;
    return true;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.edges)) return true;
    // adjacency map
    return Object.values(obj).some((v) => Array.isArray(v));
  }
  return false;
}
function isClearlyGridLike(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row))) return false;
  const rows = value as unknown[][];
  const rowLens = rows.map((r) => r.length);
  const minLen = Math.min(...rowLens);
  const maxLen = Math.max(...rowLens);
  // 빈 행이 섞인 2중 리스트(인접 리스트 등)는 그리드가 아님.
  if (maxLen === 0) return false;
  if (minLen === 0) return false;
  const rectangular = maxLen - minLen <= 2;
  const scalarRatio = rows.flat().filter((v) => v == null || ["number", "string", "boolean"].includes(typeof v)).length
    / Math.max(1, rows.flat().length);
  return rectangular && scalarRatio > 0.88;
}

function isDirectionVectorTuple(value: unknown): boolean {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === "number"
    && typeof value[1] === "number";
}

function isDirectionVectorListLike(value: unknown): value is unknown[][] {
  return Array.isArray(value)
    && value.length > 0
    && value.length <= 16
    && (value as unknown[]).every((row) => isDirectionVectorTuple(row));
}

function formatDirectionVectorList(value: unknown[][]): string {
  const body = value.map((row) => `(${String(row[0])}, ${String(row[1])})`).join(", ");
  return `[${body}]`;
}

function isDirectionMapLike(name: string, value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (!/dir|dirs|direction|delta|move|step/i.test(name)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 12) return false;
  return entries.every(([k, v]) => /^[A-Za-z]+$/.test(k) && isDirectionVectorTuple(v));
}

function canGraphLikeUseGridView(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  return value.every((row) => Array.isArray(row));
}

function is3DBooleanStateGrid(value: unknown): value is unknown[][][] {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row) && row.length > 0)) return false;
  const rows = value as unknown[][];
  if (!rows.every((row) => row.every((cell) => Array.isArray(cell)))) return false;
  const sample = (rows[0]?.[0] as unknown[]) ?? [];
  if (sample.length === 0) return false;
  const isBoolish = (v: unknown) =>
    typeof v === "boolean"
    || (typeof v === "number" && Number.isFinite(v))
    || (typeof v === "string" && /^(true|false|t|f|0|1)$/i.test(v.trim()));
  return rows.every((row) => row.every((cell) => (cell as unknown[]).every(isBoolish)));
}

function is2DBitmaskGrid(value: unknown): value is number[][] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(
      (row) => Array.isArray(row)
        && row.length > 0
        && (row as unknown[]).every(
          (cell) => typeof cell === "number" && Number.isInteger(cell) && cell >= 0
        )
    );
}

function inferBitWidthFromGrid(grid: number[][], fallback = 1, cap = 64) {
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
      Array.from({ length: bits }, (_, z) => Boolean(mask & (1 << z)))
    )
  );
}

function buildGraphFromValue(candidate: unknown) {
  if (candidate === undefined || candidate === null) {
    return { nodes: [], links: [] };
  }

  const nodes = new Set<string>();
  const links: GraphLink[] = [];

  if (Array.isArray(candidate)) {
    const isMatrix =
      candidate.length > 0 &&
      candidate.every((row) => Array.isArray(row)) &&
      candidate.every((row) => Array.isArray(row) && row.every((v) => typeof v === "number" || v === 0 || v === 1));

    if (isMatrix) {
      const matrix = candidate as unknown[][];
      matrix.forEach((row, i) => {
        nodes.add(String(i));
        row.forEach((v, j) => {
          if (Number(v) !== 0) {
            nodes.add(String(j));
            links.push({ source: String(i), target: String(j) });
          }
        });
      });
    } else {
      // adjacency list: [ [to, to...], [[w,to], [w,to] ...], ... ]
      candidate.forEach((row, i) => {
        const from = String(i);
        nodes.add(from);
        if (!Array.isArray(row)) return;
        (row as unknown[]).forEach((toVal) => {
          let to = "";
          let weight: string | undefined;
          if (Array.isArray(toVal)) {
            // Weighted edge convention for many Python codes: [cost, to]
            // Accept both number and numeric-string payloads from runtime serializer.
            const a = toFiniteNumber(toVal[0]);
            const b = toFiniteNumber(toVal[1]);
            if (toVal.length >= 2 && a !== null && b !== null) {
              weight = String(a);
              to = String(b);
            } else {
              to = String(toVal[0]);
            }
          } else {
            to = String(toVal);
          }
          if (!to || to === "undefined" || to === "null") return;
          nodes.add(to);
          links.push({ source: from, target: to, weight });
        });
      });
    }
  } else if (candidate && typeof candidate === "object") {
    const obj = candidate as Record<string, unknown>;
    if (Array.isArray(obj.edges)) {
      (obj.edges as unknown[]).forEach((edge) => {
        if (Array.isArray(edge) && edge.length >= 2) {
          const from = String(edge[0]);
          const to = String(edge[1]);
          const weight = edge.length >= 3 ? String(edge[2]) : undefined;
          nodes.add(from);
          nodes.add(to);
          links.push({ source: from, target: to, weight });
          return;
        }
        if (edge && typeof edge === "object") {
          const e = edge as Record<string, unknown>;
          const from = String(e.from ?? e.u ?? "");
          const to = String(e.to ?? e.v ?? "");
          const weightRaw = e.weight ?? e.w ?? e.cost;
          const weight = weightRaw !== undefined ? String(weightRaw) : undefined;
          if (!from || !to) return;
          nodes.add(from);
          nodes.add(to);
          links.push({ source: from, target: to, weight });
        }
      });
    }
    Object.entries(obj).forEach(([from, tos]) => {
      if (from === "edges") return;
      nodes.add(from);
      if (!Array.isArray(tos)) return;
      tos.forEach((toVal) => {
        let to = "";
        let weight: string | undefined;
        if (Array.isArray(toVal) && toVal.length >= 2) {
          // Weighted adjacency map convention: [to, weight]
          to = String(toVal[0]);
          weight = String(toVal[1]);
        } else {
          to = String(toVal);
        }
        if (!to || to === "undefined" || to === "null") return;
        nodes.add(to);
        links.push({ source: from, target: to, weight });
      });
    });
  }

  const nodeList: GraphNode[] = Array.from(nodes).map((id) => ({ id, label: id }));
  return { nodes: nodeList, links };
}

function isRenderableStructure(value: unknown) {
  return Array.isArray(value) || (!!value && typeof value === "object");
}

function GraphCanvas({
  graphKey,
  graph,
  graphMode,
  positionRef,
  stepState
}: {
  graphKey: string;
  graph: { nodes: GraphNode[]; links: GraphLink[] };
  graphMode: "directed" | "undirected";
  positionRef: React.MutableRefObject<Map<string, { x: number; y: number; vx?: number; vy?: number }>>;
  stepState: GraphStepState;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const layoutSignatureRef = useRef<Map<string, string>>(new Map());
  const simRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const graphSignature = useMemo(() => topologySignature(graph), [graph]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const wrap = wrapRef.current;
    if (!svgEl || !wrap) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    if (graph.nodes.length === 0) return;

    const width = Math.max(wrap.clientWidth, 260);
    const height = Math.max(320, Math.round(Math.max(wrap.clientHeight, 220) * 0.62));
    const nodes: SimNode[] = graph.nodes.map((n, idx) => {
      const prev = positionRef.current.get(`${graphKey}:${n.id}`);
      if (prev) {
        return { ...n, x: prev.x, y: prev.y, vx: prev.vx ?? 0, vy: prev.vy ?? 0 };
      }
      const angle = (idx / Math.max(graph.nodes.length, 1)) * Math.PI * 2;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * 70,
        y: height / 2 + Math.sin(angle) * 70,
        vx: 0,
        vy: 0
      };
    });
    const links: SimLink[] = graph.links.map((l) => ({ source: l.source, target: l.target, weight: l.weight }));
    const nodeById = new Map(nodes.map((n) => [n.id, n] as const));

    svg.attr("viewBox", `0 0 ${width} ${height}`).style("overflow", "visible");
    const arrowId = `graph-arrow-${svgSafeId(graphKey)}`;
    const root = svg.append("g");
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 3]).on("zoom", (event) => {
      root.attr("transform", event.transform);
    });
    svg.call(zoomBehavior);

    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", arrowId)
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("refX", 9)
      .attr("refY", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L10,5 L0,10 z")
      .attr("fill", "#a8cfff");

    const linkSel = root
      .append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).stroke;
      })
      .attr("stroke-opacity", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).opacity;
      })
      .attr("stroke-width", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).width;
      })
      .attr("stroke-dasharray", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).dash;
      })
      .attr("marker-end", graphMode === "directed" ? `url(#${arrowId})` : null);
    const edgeLabelSel = root
      .append("g")
      .selectAll<SVGTextElement, SimLink>("text")
      .data(links.filter((l) => !!l.weight))
      .join("text")
      .attr("fill", "#f2cc60")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0b1119")
      .attr("stroke-width", 3.2)
      .text((d) => d.weight ?? "");

    const nodeSel = root
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "grab");

    nodeSel
      .append("circle")
      .attr("r", 17)
      .attr("fill", (d) => nodePalette(stepState, d.id).fill)
      .attr("stroke", (d) => nodePalette(stepState, d.id).stroke)
      .attr("stroke-width", (d) => nodePalette(stepState, d.id).sw);
    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#e6edf3")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .text((d) => d.label);

    const centerX = width / 2;
    const centerY = height / 2;
    const hasEdges = links.length > 0;
    const sim = d3.forceSimulation<SimNode>(nodes);
    simRef.current = sim;
    const signature = graphSignature;
    const prevSignature = layoutSignatureRef.current.get(graphKey);
    const shouldReLayout = prevSignature !== signature;
    layoutSignatureRef.current.set(graphKey, signature);
    if (hasEdges) {
      // Connected graph: use link tension as the primary interaction.
      sim
        .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(110).strength(0.95))
        .force("charge", d3.forceManyBody<SimNode>().strength(-18))
        .force("center", d3.forceCenter(centerX, centerY).strength(0.08))
        .force("clusterX", null)
        .force("clusterY", null)
        .force("radial", null)
        .force("collide", d3.forceCollide<SimNode>(30).strength(1));
    } else {
      // Disconnected nodes: use attraction between nodes.
      sim
        .force("link", null)
        .force("charge", d3.forceManyBody<SimNode>().strength(75))
        .force("center", d3.forceCenter(centerX, centerY).strength(0.22))
        .force("clusterX", d3.forceX<SimNode>(centerX).strength(0.26))
        .force("clusterY", d3.forceY<SimNode>(centerY).strength(0.26))
        .force("radial", d3.forceRadial<SimNode>(Math.min(width, height) * 0.26, centerX, centerY).strength(0.12))
        .force("collide", d3.forceCollide<SimNode>(30).strength(1));
    }

    nodeSel.call(
      d3
        .drag<SVGGElement, SimNode>()
        .on("start", function (event, d) {
          if (!event.active) sim.alphaTarget(0.22).restart();
          d.fx = d.x;
          d.fy = d.y;
          d3.select(this).style("cursor", "grabbing");
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", function (event, d) {
          if (!event.active) sim.alphaTarget(0.06);
          d.fx = null;
          d.fy = null;
          d3.select(this).style("cursor", "grab");
        })
    );

    const getEndpoint = (end: string | number | SimNode) => {
      if (typeof end === "string" || typeof end === "number") {
        return nodeById.get(String(end));
      }
      return end;
    };

    const draw = () => {
      linkSel.each(function (d) {
        const s = getEndpoint(d.source as string | number | SimNode);
        const t = getEndpoint(d.target as string | number | SimNode);
        const sx = s?.x ?? 0;
        const sy = s?.y ?? 0;
        const tx = t?.x ?? 0;
        const ty = t?.y ?? 0;
        const sh = shortenEdgeEndpoints(sx, sy, tx, ty, GRAPH_NODE_R, GRAPH_NODE_R);
        d3.select(this).attr("x1", sh.x1).attr("y1", sh.y1).attr("x2", sh.x2).attr("y2", sh.y2);
      });
      edgeLabelSel
        .attr("x", (d) => {
          const s = getEndpoint(d.source as string | number | SimNode);
          const t = getEndpoint(d.target as string | number | SimNode);
          return ((s?.x ?? 0) + (t?.x ?? 0)) / 2;
        })
        .attr("y", (d) => {
          const s = getEndpoint(d.source as string | number | SimNode);
          const t = getEndpoint(d.target as string | number | SimNode);
          return (((s?.y ?? 0) + (t?.y ?? 0)) / 2) - 8;
        });
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      nodes.forEach((n) => {
        if (typeof n.x === "number" && typeof n.y === "number") {
          positionRef.current.set(`${graphKey}:${n.id}`, { x: n.x, y: n.y, vx: n.vx ?? 0, vy: n.vy ?? 0 });
        }
      });
    };
    if (shouldReLayout) {
      // Topology changed: allow short smooth settling.
      sim.alpha(0.85).alphaDecay(0.08).velocityDecay(0.32);
    }
    sim.on("tick", draw);
    if (shouldReLayout) {
      // Topology actually changed: warm up once.
      sim.alpha(0.85).alphaDecay(0.08).velocityDecay(0.3);
    } else {
      // Keep obsidian-like ambient motion without reset/jitter.
      sim.alpha(Math.max(sim.alpha(), 0.12)).alphaDecay(0.045).velocityDecay(0.22);
    }
    sim.alphaTarget(0.02).restart();
    draw();

    return () => {
      sim.alphaTarget(0);
      sim.stop();
      if (simRef.current === sim) simRef.current = null;
    };
  }, [graphKey, graphMode, positionRef, graphSignature]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const linkSel = svg.selectAll<SVGLineElement, SimLink>("line");
    const nodeSel = svg.selectAll<SVGGElement, SimNode>("g");
    const circleSel = nodeSel.selectAll<SVGCircleElement, SimNode>("circle");
    linkSel
      .attr("stroke", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).stroke;
      })
      .attr("stroke-opacity", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).opacity;
      })
      .attr("stroke-width", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).width;
      })
      .attr("stroke-dasharray", (d) => {
        const s = getSimLinkEndId(d.source as string | number | SimNode);
        const t = getSimLinkEndId(d.target as string | number | SimNode);
        return linkStyleForStep(stepState, s, t).dash;
      });
    circleSel
      .attr("fill", (d) => nodePalette(stepState, d.id).fill)
      .attr("stroke", (d) => nodePalette(stepState, d.id).stroke)
      .attr("stroke-width", (d) => nodePalette(stepState, d.id).sw);
  }, [stepState, graphKey]);

  if (graph.nodes.length === 0) {
    return (
      <div className="h-[360px] rounded border border-prova-line bg-[#0b1119] grid place-items-center text-sm text-prova-muted">
        현재 단계에서는 그래프가 아직 구성되지 않았습니다.
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative min-h-[360px] overflow-hidden rounded border border-prova-line bg-[#0b1119]"
    >
      <svg ref={svgRef} className="block h-[360px] w-full" style={{ overflow: "visible" }} />
      <GraphLegendOverlay graphMode={graphMode} hasResultOrder={stepState.resultOrder.length > 0} />
    </div>
  );
}

export function GraphPanel({
  step,
  graphVarName,
  graphVarNames = [],
  traceSteps = [],
  graphMode = "undirected",
  bitmaskMode = false,
  bitWidth = 1,
  linearPivots,
  linearContextVarNames,
  playbackControls
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef<Map<string, { x: number; y: number; vx?: number; vy?: number }>>(new Map());
  const [array2DModeByVar, setArray2DModeByVar] = useState<Record<string, "GRID" | "GRAPH">>({});
  const stepState = useMemo(() => deriveGraphStepState(step?.vars ?? {}), [step]);

  const parsed = useMemo(() => {
    if (!step) return null;
    const currentVars = step.vars ?? {};
    const historySource = traceSteps.length > 0 ? traceSteps : [step];
    const historyUpToCurrent = historySource.filter((s) => (s.step ?? 0) <= (step.step ?? 0));

    // Keep the latest renderable state across steps so visualization
    // does not disappear while stepping inside recursive/function scopes.
    const stickyRenderableVars: Record<string, unknown> = {};
    historyUpToCurrent.forEach((s) => {
      Object.entries(s.vars ?? {}).forEach(([k, v]) => {
        if (!isRenderableStructure(v)) return;
        stickyRenderableVars[k] = v;
      });
    });
    const vars: Record<string, unknown> = { ...stickyRenderableVars, ...currentVars };
    const explicitGraphVars = [
      ...graphVarNames,
      ...(graphVarName ? [graphVarName] : []),
    ].filter((v, idx, arr) => !!v && arr.indexOf(v) === idx);

    const graphKeys = new Set<string>();
    explicitGraphVars.forEach((name) => {
      if (vars[name] !== undefined) graphKeys.add(name);
    });
    Object.entries(vars).forEach(([name, value]) => {
      if (isDirectionMapLike(name, value)) return;
      if (isClearlyGridLike(value)) return;
      if (looksLike2DScalarTableGrid(value)) return;
      if (detectGraphLike(value) && /graph|adj|edge|matrix/i.test(name)) {
        graphKeys.add(name);
      }
    });

    const structures = Object.entries(vars)
      .filter(([key, value]) => key !== "step" && isRenderableStructure(value))
      .map(([key, value]) => {
        const kind = isDirectionMapLike(key, value)
          ? "OBJECT"
          : isDirectionVectorListLike(value)
            ? "OBJECT"
          : isClearlyGridLike(value)
            ? "ARRAY2D"
          : looksLike2DScalarTableGrid(value)
            ? "ARRAY2D"
          : is2DRectangularCellGrid(value)
            ? "ARRAY2D"
          : detectGraphLike(value)
            ? "GRAPHLIKE"
            : is2DArray(value)
            ? "ARRAY2D"
            : is1DArray(value)
              ? "ARRAY1D"
              : "OBJECT";
        return { key, value, kind: kind as "ARRAY2D" | "ARRAY1D" | "OBJECT" | "GRAPHLIKE" };
      });

    return { graphKeys, structures };
  }, [graphVarName, graphVarNames, step, traceSteps]);

  const maxArrayLenByVar = useMemo(() => {
    const out: Record<string, number> = {};
    const source = traceSteps && traceSteps.length > 0 ? traceSteps : step ? [step] : [];
    source.forEach((s) => {
      Object.entries(s.vars ?? {}).forEach(([key, value]) => {
        if (!is1DArray(value)) return;
        out[key] = Math.max(out[key] ?? 0, value.length);
      });
    });
    return out;
  }, [step, traceSteps]);

  useEffect(() => {
    if (!parsed) return;
    setArray2DModeByVar((prev) => {
      const next = { ...prev };
      parsed.structures.forEach(({ key, kind, value }) => {
        if (kind !== "ARRAY2D" && kind !== "GRAPHLIKE") return;
        if (kind === "GRAPHLIKE" && !canGraphLikeUseGridView(value)) {
          next[key] = "GRAPH";
          return;
        }
        if (!next[key]) {
          const preferGridView =
            looksLike2DScalarTableGrid(value) ||
            isClearlyGridLike(value) ||
            is2DRectangularCellGrid(value);
          next[key] = parsed.graphKeys.has(key) && !preferGridView ? "GRAPH" : "GRID";
        }
      });
      return next;
    });
  }, [parsed]);

  if (!parsed || !step) {
    return <div className="h-full grid place-items-center text-sm text-prova-muted">실행 후 그래프가 표시됩니다.</div>;
  }

  const vars = step.vars ?? {};
  const array1DKeys = parsed.structures.filter((s) => s.kind === "ARRAY1D").map((s) => s.key);
  const linearContextLine = formatLinearAlgoContext(vars, linearContextVarNames);

  return (
    <div ref={containerRef} className="h-full w-full p-3">
      <div className="h-full w-full overflow-auto prova-scrollbar space-y-3">
        {linearContextLine ? (
          <div
            className="rounded border border-[#2d4f79]/45 bg-[#0c141c] px-2 py-1.5 text-[10px] font-mono text-[#9ac7ff]/95"
            title="이번 스텝의 비교·합 등 (트레이스에 노출된 경우)"
          >
            {linearContextLine}
          </div>
        ) : null}
        {/* Structure regions */}
        <div className="space-y-2">
          {parsed.structures.map((structure) => {
            const promoted3D =
              bitmaskMode && is2DBitmaskGrid(structure.value)
                ? expand2DBitmaskGridTo3D(
                    structure.value as number[][],
                    inferBitWidthFromGrid(structure.value as number[][], bitWidth, 64)
                  )
                : null;
            const lockGridOnly =
              is3DBooleanStateGrid(structure.value) ||
              !!promoted3D ||
              isDirectionVectorListLike(structure.value);
            const canToggleGraphGrid =
              structure.kind === "GRAPHLIKE" && canGraphLikeUseGridView(structure.value) && !lockGridOnly;
            const preferGridDefault =
              looksLike2DScalarTableGrid(structure.value) ||
              isClearlyGridLike(structure.value) ||
              is2DRectangularCellGrid(structure.value);
            const default2dMode =
              parsed.graphKeys.has(structure.key) && !preferGridDefault ? "GRAPH" : "GRID";
            const resolvedMode = lockGridOnly
              ? "GRID"
              : !canToggleGraphGrid && structure.kind === "GRAPHLIKE"
              ? "GRAPH"
              : (array2DModeByVar[structure.key] ?? default2dMode);
            return (
            <div key={structure.key} className="rounded border border-prova-line bg-[#0f141a] p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[#9ac7ff] uppercase tracking-widest">{structure.key}</div>
                {canToggleGraphGrid && (
                  <div className="inline-flex items-center rounded border border-prova-line overflow-hidden text-[10px] font-mono">
                    <button
                      className={`px-2 py-[2px] ${resolvedMode === "GRID" ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`}
                      onClick={() => setArray2DModeByVar((prev) => ({ ...prev, [structure.key]: "GRID" }))}
                    >
                      GRID
                    </button>
                    <button
                      className={`px-2 py-[2px] border-l border-prova-line ${resolvedMode === "GRAPH" ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`}
                      onClick={() => setArray2DModeByVar((prev) => ({ ...prev, [structure.key]: "GRAPH" }))}
                    >
                      GRAPH
                    </button>
                  </div>
                )}
              </div>
              {(structure.kind === "ARRAY2D" || structure.kind === "GRAPHLIKE") && resolvedMode === "GRAPH" ? (
                <GraphCanvas
                  graphKey={structure.key}
                  graph={buildGraphFromValue(structure.value)}
                  graphMode={graphMode}
                  positionRef={positionRef}
                  stepState={stepState}
                />
              ) : (structure.kind === "ARRAY2D" || structure.kind === "GRAPHLIKE") ? (
                <div className="overflow-auto">
                  {(() => {
                    if (is3DBooleanStateGrid(structure.value) || promoted3D) {
                      const fk = typeof vars.nk === "number"
                        ? vars.nk
                        : (typeof vars.k === "number" ? vars.k : 0);
                      return (
                        <ThreeDVolumePanel
                          name={structure.key}
                          volume={(promoted3D ?? structure.value) as unknown[][][]}
                          traceSteps={traceSteps}
                          focusIndex={fk}
                          bitmaskMode={bitmaskMode}
                          bitWidth={bitWidth}
                          playbackControls={playbackControls}
                        />
                      );
                    }
                    const grid = to2D(structure.value);
                    const maxCols = Math.max(1, ...grid.map((r) => r.length));
                    const positiveMax = getPositiveMaxInGrid(grid);
                    return (
                  <div
                    className="inline-grid gap-1"
                    style={{
                      gridTemplateColumns: `28px repeat(${maxCols}, minmax(28px, auto))`
                    }}
                  >
                    <div />
                    {Array.from({ length: maxCols }, (_, c) => (
                      <div key={`${structure.key}-head-c-${c}`} className="text-[10px] text-prova-muted text-center font-mono">
                        x{c}
                      </div>
                    ))}
                    {grid.map((row, r) => (
                      <div key={`${structure.key}-row-${r}`} className="contents">
                        <div className="text-[10px] text-prova-muted text-right pr-1 font-mono self-center">y{r}</div>
                        {Array.from({ length: maxCols }, (_, c) => (
                          <div
                            key={`${structure.key}-c-${r}-${c}`}
                            className={`min-w-7 h-7 px-1 rounded border text-[11px] font-mono grid place-items-center ${getGridCellTone(row[c], positiveMax)}`}
                          >
                            {row[c] !== undefined
                              ? Array.isArray(row[c])
                                ? row[c].map((v) => formatScalar(v, bitmaskMode, bitWidth)).join(",")
                                : formatScalar(row[c], bitmaskMode, bitWidth)
                              : ""}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                    );
                  })()}
                </div>
              ) : structure.kind === "ARRAY1D" ? (
                <div className="overflow-auto">
                  {(() => {
                    const arr = structure.value as unknown[];
                    const slotLen = Math.max(1, maxArrayLenByVar[structure.key] ?? arr.length);
                    const ptrMap: LinearPointerMap = pointersAtIndexFromSpecs(
                      linearPivots,
                      vars,
                      structure.key,
                      arr.length,
                      array1DKeys
                    );
                    return (
                  <div className="flex items-start gap-1">
                    {Array.from({ length: slotLen }, (_, i) => {
                      const hasValue = i < arr.length;
                      const ptrs = hasValue ? ptrMap.get(i) ?? [] : [];
                      const ringExtra = ptrs[0]?.ringClass ?? "";
                      return (
                        <div key={`${structure.key}-slot-${i}`} className="flex flex-col items-center gap-0.5 min-w-[34px]">
                          <div className="text-[10px] text-prova-muted font-mono tabular-nums">x{i}</div>
                          <div
                            className={`min-w-8 h-8 px-1 rounded border text-[11px] font-mono grid place-items-center transition-all duration-150 ${
                              hasValue
                                ? `border-[#2d4f79] bg-[#11243d] text-[#c9d1d9] ${ringExtra}`
                                : "border-[#2a2f36] bg-[#0d1117] text-[#6e7681]"
                            }`}
                          >
                            {hasValue ? formatScalar(arr[i], bitmaskMode, bitWidth) : ""}
                          </div>
                          {ptrs.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-0.5 max-w-[52px]">
                              {ptrs.map((p) => (
                                <span
                                  key={`${structure.key}-${i}-${p.varName}`}
                                  className="text-[8px] font-bold leading-none px-1 py-[1px] rounded border border-white/15 bg-black/35 text-[#e6edf3]"
                                  title={p.varName}
                                >
                                  {p.badge}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="rounded border border-[#2d4f79] bg-[#0f1f33] p-2 overflow-auto">
                  {isDirectionVectorListLike(structure.value) ? (
                    <pre className="rounded border border-[#27496f] bg-[#0d1a2a] px-3 py-2 text-[11px] leading-5 font-mono text-[#c9d1d9] whitespace-pre overflow-auto">
                      {formatDirectionVectorList(structure.value)}
                    </pre>
                  ) : isPlainObject(structure.value) ? (
                    <pre className="rounded border border-[#27496f] bg-[#0d1a2a] px-3 py-2 text-[11px] leading-5 font-mono text-[#c9d1d9] whitespace-pre overflow-auto">
                      {toJsonPreferSingleLine(
                        Object.fromEntries(
                          Object.entries(structure.value).sort(([a], [b]) => a.localeCompare(b))
                        ),
                        120,
                        bitmaskMode,
                        bitWidth
                      )}
                    </pre>
                  ) : (
                    <div className="text-[11px] font-mono text-[#c9d1d9]">{JSON.stringify(structure.value)}</div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
