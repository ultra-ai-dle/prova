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
import {
  toFiniteNumber,
  isPlainObject,
  formatScalar,
  formatCompact,
  toJsonLike,
  toJsonCompact,
  toJsonPreferSingleLine,
} from "@/lib/formatValue";
import {
  is2DArray,
  is1DArray,
  to2D,
  getPositiveMaxInGrid,
  getGridCellTone,
  looksLike2DScalarTableGrid,
  is2DRectangularCellGrid,
  detectGraphLike,
  isClearlyGridLike,
  canGraphLikeUseGridView,
  isDirectionVectorTuple,
  isDirectionVectorListLike,
  isDirectionMapLike,
  is3DBooleanStateGrid,
  is2DBitmaskGrid,
  inferBitWidthFromGrid,
  expand2DBitmaskGridTo3D,
} from "@/lib/dataDetection";

type SpecialKind = "HEAP" | "QUEUE" | "STACK" | "DEQUE" | "UNIONFIND" | "VISITED" | "DISTANCE" | "PARENT_TREE";

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
  /** AI가 판단한 변수별 특수 자료구조 뷰 종류 */
  specialVarKinds?: Record<string, SpecialKind>;
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

function formatDirectionVectorList(value: unknown[][]): string {
  const body = value.map((row) => `(${String(row[0])}, ${String(row[1])})`).join(", ");
  return `[${body}]`;
}

// ── HeapTreeView ──────────────────────────────────────────────────────────────

const HEAP_NODE_R = 16;
const HEAP_V_GAP = 54;

function computeHeapPositions(n: number): Array<{ x: number; y: number }> {
  const capped = Math.min(n, 63);
  const maxLevel = Math.floor(Math.log2(Math.max(capped, 1)));
  const leafCount = Math.pow(2, maxLevel);
  const H_UNIT = 40;
  const totalW = leafCount * H_UNIT;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < capped; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const levelStart = Math.pow(2, level) - 1;
    const posInLevel = i - levelStart;
    const levelCount = Math.pow(2, level);
    out.push({
      x: ((posInLevel + 0.5) / levelCount) * totalW,
      y: level * HEAP_V_GAP + HEAP_NODE_R + 8,
    });
  }
  return out;
}

function HeapTreeView({
  arr,
  stepState,
  bitmaskMode,
  bitWidth,
}: {
  arr: unknown[];
  stepState: GraphStepState;
  bitmaskMode?: boolean;
  bitWidth?: number;
}) {
  const capped = Math.min(arr.length, 63);
  const positions = useMemo(() => computeHeapPositions(capped), [capped]);

  if (positions.length === 0) return null;

  const maxLevel = Math.floor(Math.log2(Math.max(capped, 1)));
  const leafCount = Math.pow(2, maxLevel);
  const svgW = Math.max(leafCount * 40, 80);
  const svgH = (maxLevel + 1) * HEAP_V_GAP + HEAP_NODE_R + 24;

  const getLabel = (v: unknown) => {
    if (Array.isArray(v) && v.length >= 2) return `${v[0]},${v[1]}`;
    return formatScalar(v, bitmaskMode, bitWidth);
  };
  const getNodeId = (v: unknown, i: number) => {
    if (Array.isArray(v) && v.length >= 2) return toNodeId(v[1]) ?? String(i);
    return toNodeId(v) ?? String(i);
  };

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW, display: "block" }}>
        {positions.map((pos, i) => {
          if (i === 0) return null;
          const pPos = positions[Math.floor((i - 1) / 2)];
          return (
            <line
              key={`he-${i}`}
              x1={pPos.x} y1={pPos.y}
              x2={pos.x} y2={pos.y}
              stroke="#2d4468" strokeWidth={1.5}
            />
          );
        })}
        {positions.map((pos, i) => {
          const v = arr[i];
          const nid = getNodeId(v, i);
          const cur = stepState.currentNode === nid;
          const frt = stepState.frontierNodes.has(nid);
          const vis = stepState.visitedNodes.has(nid);
          const fill = cur ? "#4a3512" : frt ? "#2f1f4f" : vis ? "#113a2b" : "#1b2b42";
          const stroke = cur ? "#f2cc60" : frt ? "#b28cff" : vis ? "#58d68d" : "#85c2ff";
          return (
            <g key={`hn-${i}`} transform={`translate(${pos.x},${pos.y})`}>
              <circle r={HEAP_NODE_R} fill={fill} stroke={stroke} strokeWidth={cur ? 2.8 : 1.8} />
              <text textAnchor="middle" dominantBaseline="middle" fill="#e6edf3" fontSize={9} fontWeight={700} fontFamily="monospace">
                {getLabel(v)}
              </text>
              <text y={HEAP_NODE_R + 10} textAnchor="middle" fill="#4a5568" fontSize={8} fontFamily="monospace">
                [{i}]
              </text>
            </g>
          );
        })}
      </svg>
      {arr.length > 63 && (
        <div className="text-[10px] text-prova-muted mt-1">+{arr.length - 63} 노드 생략</div>
      )}
    </div>
  );
}

// ── QueueView ────────────────────────────────────────────────────────────────

function QueueView({
  arr,
  bitmaskMode,
  bitWidth,
}: {
  arr: unknown[];
  bitmaskMode?: boolean;
  bitWidth?: number;
}) {
  const getLabel = (v: unknown) => {
    if (Array.isArray(v)) return `[${(v as unknown[]).map((x) => formatScalar(x, bitmaskMode, bitWidth)).join(",")}]`;
    return formatScalar(v, bitmaskMode, bitWidth);
  };

  return (
    <div className="py-2 px-1 space-y-2">
      {/* 파이프 몸통 */}
      <div className="flex items-stretch overflow-auto">
        {/* DEQUEUE 출구 (왼쪽) */}
        <div className="flex flex-col items-center justify-center shrink-0 mr-1">
          <div className="text-[8px] text-[#58d68d] font-mono font-bold mb-1">DEQUEUE</div>
          <svg width={20} height={36} viewBox="0 0 20 36">
            <path d="M16,18 L4,18 M8,10 L4,18 L8,26" stroke="#58d68d" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* 파이프 상단 라인 */}
        <div className="flex flex-col justify-between">
          <div className="h-[1px] bg-[#2d4f79] w-full" />
          <div className="flex items-center gap-0">
            {arr.length === 0 ? (
              <div className="h-10 px-6 border-y border-[#2d4f79] bg-[#0a1520] text-[11px] text-prova-muted font-mono flex items-center">empty</div>
            ) : arr.map((v, i) => {
              const isFront = i === 0;
              const isBack = i === arr.length - 1;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`h-10 min-w-[38px] px-2 border-y border-r text-[11px] font-mono flex flex-col items-center justify-center gap-0.5
                      ${isFront ? "border-[#58d68d] bg-[#091f14]" : isBack ? "border-[#b28cff] bg-[#110a22]" : "border-[#2d4f79] bg-[#0a1520]"}
                      ${i === 0 ? "border-l" : ""}`}
                  >
                    <span className={`font-bold ${isFront ? "text-[#58d68d]" : isBack ? "text-[#b28cff]" : "text-[#c9d1d9]"}`}>
                      {getLabel(v)}
                    </span>
                    {(isFront || isBack) && (
                      <span className={`text-[7px] font-bold leading-none ${isFront ? "text-[#58d68d]/70" : "text-[#b28cff]/70"}`}>
                        {isFront && isBack ? "FRONT=BACK" : isFront ? "FRONT" : "BACK"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-[1px] bg-[#2d4f79] w-full" />
        </div>
        {/* ENQUEUE 입구 (오른쪽) */}
        <div className="flex flex-col items-center justify-center shrink-0 ml-1">
          <div className="text-[8px] text-[#b28cff] font-mono font-bold mb-1">ENQUEUE</div>
          <svg width={20} height={36} viewBox="0 0 20 36">
            <path d="M4,18 L16,18 M12,10 L16,18 L12,26" stroke="#b28cff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {/* 인덱스 */}
      {arr.length > 0 && (
        <div className="flex pl-[28px] gap-0">
          {arr.map((_, i) => (
            <div key={i} className="min-w-[38px] text-center text-[9px] text-prova-muted font-mono">{i}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── UnionFindView ─────────────────────────────────────────────────────────────

function buildUFForest(arr: unknown[]): { children: number[][]; roots: number[] } {
  const n = arr.length;
  const children: number[][] = Array.from({ length: n }, () => []);
  const roots: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = arr[i] as number;
    if (p === i) roots.push(i);
    else if (p >= 0 && p < n) children[p].push(i);
  }
  return { children, roots };
}

function layoutUFForest(roots: number[], children: number[][]): Map<number, { x: number; y: number }> {
  const pos = new Map<number, { x: number; y: number }>();
  const H = 44;
  const V = 52;
  let col = 0;

  function place(node: number, depth: number) {
    const kids = children[node];
    if (kids.length === 0) {
      pos.set(node, { x: col * H + H / 2, y: depth * V + 20 });
      col++;
      return;
    }
    const start = col;
    for (const kid of kids) place(kid, depth + 1);
    const end = col;
    pos.set(node, { x: ((start + end) / 2) * H, y: depth * V + 20 });
  }

  for (const root of roots) {
    place(root, 0);
    col += 0.5;
  }
  return pos;
}

function UnionFindView({
  arr,
  stepState,
}: {
  arr: unknown[];
  stepState: GraphStepState;
}) {
  const { children, roots } = useMemo(() => buildUFForest(arr), [arr]);
  const positions = useMemo(() => layoutUFForest(roots, children), [roots, children]);

  if (roots.length === 0) {
    return <div className="text-[11px] text-prova-muted py-1">(빈 구조)</div>;
  }

  const NODE_R = 15;
  let maxX = 0;
  let maxY = 0;
  positions.forEach(({ x, y }) => {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  const svgW = Math.max(maxX + NODE_R + 20, 80);
  const svgH = Math.max(maxY + NODE_R + 24, 60);

  const edges: Array<{ from: number; to: number }> = [];
  for (let i = 0; i < arr.length; i++) {
    for (const child of children[i]) edges.push({ from: i, to: child });
  }

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW, display: "block" }}>
        {edges.map(({ from, to }) => {
          const fp = positions.get(from);
          const tp = positions.get(to);
          if (!fp || !tp) return null;
          return (
            <line
              key={`uf-e-${from}-${to}`}
              x1={fp.x} y1={fp.y + NODE_R}
              x2={tp.x} y2={tp.y - NODE_R}
              stroke="#2d4468" strokeWidth={1.5}
            />
          );
        })}
        {Array.from(positions.entries()).map(([nodeId, p]) => {
          const nid = String(nodeId);
          const cur = stepState.currentNode === nid;
          const frt = stepState.frontierNodes.has(nid);
          const vis = stepState.visitedNodes.has(nid);
          const isRoot = (arr[nodeId] as number) === nodeId;
          const fill = cur ? "#4a3512" : frt ? "#2f1f4f" : vis ? "#113a2b" : "#1b2b42";
          const stroke = cur ? "#f2cc60" : frt ? "#b28cff" : isRoot ? "#58a6ff" : "#85c2ff";
          return (
            <g key={`uf-n-${nodeId}`} transform={`translate(${p.x},${p.y})`}>
              <circle r={NODE_R} fill={fill} stroke={stroke} strokeWidth={isRoot ? 2.5 : 1.8} />
              <text textAnchor="middle" dominantBaseline="middle" fill="#e6edf3" fontSize={10} fontWeight={700} fontFamily="monospace">
                {nodeId}
              </text>
              {isRoot && (
                <text y={-NODE_R - 5} textAnchor="middle" fill="#58a6ff" fontSize={8} fontFamily="monospace">
                  root
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── StackView ─────────────────────────────────────────────────────────────────

function StackView({
  arr,
  bitmaskMode,
  bitWidth,
}: {
  arr: unknown[];
  bitmaskMode?: boolean;
  bitWidth?: number;
}) {
  const getLabel = (v: unknown) => {
    if (Array.isArray(v)) return `[${(v as unknown[]).map((x) => formatScalar(x, bitmaskMode, bitWidth)).join(",")}]`;
    return formatScalar(v, bitmaskMode, bitWidth);
  };

  return (
    <div className="py-2 px-1 inline-flex flex-col items-start gap-0">
      {/* PUSH 화살표 (위) */}
      <div className="flex items-center gap-2 mb-1 self-stretch justify-center">
        <svg width={40} height={16} viewBox="0 0 40 16">
          <path d="M20,2 L20,12 M15,8 L20,13 L25,8" stroke="#f2cc60" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[8px] text-[#f2cc60] font-mono font-bold uppercase tracking-widest">PUSH</span>
      </div>

      {/* 스택 칸들 (top이 위) */}
      <div className="flex flex-col-reverse items-stretch w-full border border-[#2d4f79] rounded overflow-hidden">
        {arr.length === 0 ? (
          <div className="h-10 flex items-center justify-center text-[11px] text-prova-muted font-mono">empty</div>
        ) : arr.map((v, i) => {
          const isTop = i === arr.length - 1;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 h-9 border-b border-[#1e2d3d] last:border-b-0
                ${isTop ? "bg-[#1e1700] border-l-2 border-l-[#f2cc60]" : "bg-[#0a1520]"}`}
            >
              <span className="text-[9px] text-[#4a5568] font-mono w-4 shrink-0">{i}</span>
              <span className={`text-[12px] font-mono font-bold flex-1 ${isTop ? "text-[#f2cc60]" : "text-[#c9d1d9]"}`}>
                {getLabel(v)}
              </span>
              {isTop && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#f2cc60]/15 text-[#f2cc60] border border-[#f2cc60]/30 shrink-0">
                  TOP
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 바닥 */}
      <div className="self-stretch h-2 bg-[#1e2d3d] rounded-b border-x border-b border-[#2d4f79] flex items-center justify-center">
        <div className="w-8 h-[2px] bg-[#2d4f79] rounded" />
      </div>

      {/* POP 화살표 (위) */}
      <div className="flex items-center gap-2 mt-1 self-stretch justify-center">
        <svg width={40} height={16} viewBox="0 0 40 16">
          <path d="M20,14 L20,4 M15,8 L20,3 L25,8" stroke="#85c2ff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[8px] text-[#85c2ff] font-mono font-bold uppercase tracking-widest">POP</span>
      </div>
    </div>
  );
}

// ── DequeView ─────────────────────────────────────────────────────────────────

function DequeView({
  arr,
  bitmaskMode,
  bitWidth,
}: {
  arr: unknown[];
  bitmaskMode?: boolean;
  bitWidth?: number;
}) {
  const getLabel = (v: unknown) => {
    if (Array.isArray(v)) return `[${(v as unknown[]).map((x) => formatScalar(x, bitmaskMode, bitWidth)).join(",")}]`;
    return formatScalar(v, bitmaskMode, bitWidth);
  };

  return (
    <div className="py-2 px-1 space-y-1">
      {/* appendleft / popleft */}
      <div className="flex items-center gap-1 text-[8px] font-mono font-bold text-[#f2cc60] justify-start pl-1">
        <svg width={28} height={12} viewBox="0 0 28 12">
          <path d="M26,6 L4,6 M8,2 L3,6 L8,10" stroke="#f2cc60" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>appendleft / popleft</span>
      </div>

      {/* 파이프 */}
      <div className="flex items-stretch overflow-auto">
        {/* 왼쪽 열린 끝 */}
        <div className="flex items-center shrink-0">
          <div className="w-[6px] h-10 border-t-2 border-b-2 border-l-2 border-[#f2cc60] rounded-l" />
        </div>
        {arr.length === 0 ? (
          <div className="flex-1 h-10 border-t-2 border-b-2 border-[#2d4f79] flex items-center justify-center text-[11px] text-prova-muted font-mono">
            empty
          </div>
        ) : arr.map((v, i) => {
          const isLeft = i === 0;
          const isRight = i === arr.length - 1;
          return (
            <div
              key={i}
              className={`flex flex-col items-center justify-center min-w-[38px] h-10 px-2 border-t-2 border-b-2 border-r
                ${isLeft ? "border-l border-l-[#f2cc60] border-[#f2cc60] bg-[#1e1700]" :
                  isRight ? "border-[#58a6ff] bg-[#091529]" :
                  "border-[#2d4f79] bg-[#0a1520]"}
              `}
            >
              <span className={`text-[11px] font-mono font-bold ${isLeft ? "text-[#f2cc60]" : isRight ? "text-[#58a6ff]" : "text-[#c9d1d9]"}`}>
                {getLabel(v)}
              </span>
              <span className="text-[8px] text-[#4a5568] font-mono">{i}</span>
            </div>
          );
        })}
        {/* 오른쪽 열린 끝 */}
        <div className="flex items-center shrink-0">
          <div className="w-[6px] h-10 border-t-2 border-b-2 border-r-2 border-[#58a6ff] rounded-r" />
        </div>
      </div>

      {/* append / pop */}
      <div className="flex items-center gap-1 text-[8px] font-mono font-bold text-[#58a6ff] justify-end pr-1">
        <span>append / pop</span>
        <svg width={28} height={12} viewBox="0 0 28 12">
          <path d="M2,6 L24,6 M20,2 L25,6 L20,10" stroke="#58a6ff" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

// ── VisitedView ───────────────────────────────────────────────────────────────

function VisitedView({
  arr,
}: {
  arr: unknown[];
}) {
  if (arr.length === 0) {
    return <div className="text-[11px] text-prova-muted font-mono py-1">(비어있음)</div>;
  }
  return (
    <div className="flex items-start gap-1 overflow-auto py-2 flex-wrap">
      {arr.map((v, i) => {
        const visited = v === true || v === 1 || v === "True";
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="text-[10px] text-prova-muted font-mono">{i}</div>
            <div
              className={`w-7 h-7 rounded border text-[10px] font-mono grid place-items-center ${
                visited
                  ? "border-[#58d68d] bg-[#0e2b1e] text-[#7ae2a8]"
                  : "border-[#2a2f36] bg-[#0d1117] text-[#4a5568]"
              }`}
              title={visited ? "visited" : "not visited"}
            >
              {visited ? "✓" : "·"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── DistanceView ──────────────────────────────────────────────────────────────

const INF_THRESHOLD = 1e8;

function DistanceView({
  arr,
  bitmaskMode,
  bitWidth,
}: {
  arr: unknown[];
  bitmaskMode?: boolean;
  bitWidth?: number;
}) {
  if (arr.length === 0) {
    return <div className="text-[11px] text-prova-muted font-mono py-1">(비어있음)</div>;
  }
  const finite = arr
    .map((v) => (typeof v === "number" && isFinite(v) && v < INF_THRESHOLD ? v : null))
    .filter((v): v is number => v !== null);
  const minVal = finite.length > 0 ? Math.min(...finite) : 0;
  const maxVal = finite.length > 0 ? Math.max(...finite) : 1;

  return (
    <div className="flex items-start gap-1 overflow-auto py-2">
      {arr.map((v, i) => {
        const n = typeof v === "number" ? v : null;
        const isInf = n === null || !isFinite(n) || n >= INF_THRESHOLD;
        const ratio = isInf ? 0 : maxVal === minVal ? 1 : (n! - minVal) / (maxVal - minVal);
        const intensity = Math.round(ratio * 9) + 1;
        const colorMap: Record<number, string> = {
          1: "border-[#1a3a5c] bg-[#0a1e30] text-[#6baed6]",
          2: "border-[#1e4570] bg-[#0c2438] text-[#74b8e0]",
          3: "border-[#225080] bg-[#0e2a42] text-[#7dc2ea]",
          4: "border-[#265b90] bg-[#10304c] text-[#88ccf3]",
          5: "border-[#2a67a0] bg-[#123656] text-[#94d6fc]",
          6: "border-[#2e72b0] bg-[#143c60] text-[#a0e0ff]",
          7: "border-[#327ec0] bg-[#16426a] text-[#acebff]",
          8: "border-[#3689d0] bg-[#184874] text-[#b8f5ff]",
          9: "border-[#3a95e0] bg-[#1a4e7e] text-[#c4ffff]",
          10: "border-[#3ea0f0] bg-[#1c5488] text-[#d0ffff]",
        };
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="text-[10px] text-prova-muted font-mono">{i}</div>
            <div
              className={`min-w-[36px] h-8 px-1 rounded border text-[11px] font-mono grid place-items-center ${
                isInf
                  ? "border-[#3a3f47] bg-[#0d1117] text-[#4a5568]"
                  : colorMap[intensity]
              }`}
            >
              {isInf ? "INF" : formatScalar(v, bitmaskMode, bitWidth)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ParentTreeView (일반 트리) ────────────────────────────────────────────────

function ParentTreeView({
  arr,
  stepState,
}: {
  arr: unknown[];
  stepState: GraphStepState;
}) {
  // parent[i] = parent node of i. root: parent[i] === i or parent[i] === -1
  const n = arr.length;
  const children: number[][] = Array.from({ length: n }, () => []);
  const roots: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = arr[i];
    const pi = typeof p === "number" ? Math.trunc(p) : -1;
    if (pi === i || pi < 0 || pi >= n) roots.push(i);
    else children[pi].push(i);
  }

  const positions = useMemo(() => layoutUFForest(roots, children), [roots, children]);

  if (roots.length === 0) {
    return <div className="text-[11px] text-prova-muted py-1">(빈 구조)</div>;
  }

  const NODE_R = 15;
  let maxX = 0;
  let maxY = 0;
  positions.forEach(({ x, y }) => { if (x > maxX) maxX = x; if (y > maxY) maxY = y; });
  const svgW = Math.max(maxX + NODE_R + 20, 80);
  const svgH = Math.max(maxY + NODE_R + 24, 60);

  const edges: Array<{ from: number; to: number }> = [];
  for (let i = 0; i < n; i++) {
    for (const child of children[i]) edges.push({ from: i, to: child });
  }

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW, display: "block" }}>
        {edges.map(({ from, to }) => {
          const fp = positions.get(from);
          const tp = positions.get(to);
          if (!fp || !tp) return null;
          return (
            <line key={`pt-e-${from}-${to}`}
              x1={fp.x} y1={fp.y + NODE_R} x2={tp.x} y2={tp.y - NODE_R}
              stroke="#2d4468" strokeWidth={1.5}
            />
          );
        })}
        {Array.from(positions.entries()).map(([nodeId, p]) => {
          const nid = String(nodeId);
          const cur = stepState.currentNode === nid;
          const frt = stepState.frontierNodes.has(nid);
          const vis = stepState.visitedNodes.has(nid);
          const isRoot = roots.includes(nodeId);
          const fill = cur ? "#4a3512" : frt ? "#2f1f4f" : vis ? "#113a2b" : "#1b2b42";
          const stroke = cur ? "#f2cc60" : frt ? "#b28cff" : isRoot ? "#58a6ff" : "#85c2ff";
          return (
            <g key={`pt-n-${nodeId}`} transform={`translate(${p.x},${p.y})`}>
              <circle r={NODE_R} fill={fill} stroke={stroke} strokeWidth={isRoot ? 2.5 : 1.8} />
              <text textAnchor="middle" dominantBaseline="middle" fill="#e6edf3" fontSize={10} fontWeight={700} fontFamily="monospace">{nodeId}</text>
              {isRoot && <text y={-NODE_R - 5} textAnchor="middle" fill="#58a6ff" fontSize={8} fontFamily="monospace">root</text>}
            </g>
          );
        })}
      </svg>
    </div>
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

const EMPTY_SPECIAL_VAR_KINDS: Record<string, SpecialKind> = {};

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
  specialVarKinds: specialVarKindsProp,
  playbackControls
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef<Map<string, { x: number; y: number; vx?: number; vy?: number }>>(new Map());
  const [array2DModeByVar, setArray2DModeByVar] = useState<Record<string, "GRID" | "GRAPH">>({});
  const stepState = useMemo(() => deriveGraphStepState(step?.vars ?? {}), [step]);
  // specialVarKindsProp이 undefined일 때 매 렌더마다 새 {}를 만들지 않도록 안정화
  const specialVarKinds = specialVarKindsProp ?? EMPTY_SPECIAL_VAR_KINDS;

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
        const special: SpecialKind | undefined = specialVarKinds[key];
        const kind = special
          ? special
          : isDirectionMapLike(key, value)
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
        return { key, value, kind: kind as "ARRAY2D" | "ARRAY1D" | "OBJECT" | "GRAPHLIKE" | SpecialKind };
      });

    return { graphKeys, structures };
  }, [graphVarName, graphVarNames, step, traceSteps, specialVarKinds]);

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
      let dirty = false;
      parsed.structures.forEach(({ key, kind, value }) => {
        if (kind !== "ARRAY2D" && kind !== "GRAPHLIKE") return;
        if (kind === "GRAPHLIKE" && !canGraphLikeUseGridView(value)) {
          if (next[key] !== "GRAPH") { next[key] = "GRAPH"; dirty = true; }
          return;
        }
        if (!next[key]) {
          const preferGridView =
            looksLike2DScalarTableGrid(value) ||
            isClearlyGridLike(value) ||
            is2DRectangularCellGrid(value);
          const mode = parsed.graphKeys.has(key) && !preferGridView ? "GRAPH" : "GRID";
          next[key] = mode;
          dirty = true;
        }
      });
      return dirty ? next : prev;
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
            const SPECIAL_KINDS: ReadonlySet<string> = new Set(["HEAP","QUEUE","STACK","DEQUE","UNIONFIND","VISITED","DISTANCE","PARENT_TREE"]);
            const isSpecial = SPECIAL_KINDS.has(structure.kind);
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
              !isSpecial && structure.kind === "GRAPHLIKE" && canGraphLikeUseGridView(structure.value) && !lockGridOnly;
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

            const SPECIAL_BADGE_MAP: Partial<Record<string, string>> = {
              HEAP: "HEAP", QUEUE: "QUEUE", STACK: "STACK", DEQUE: "DEQUE",
              UNIONFIND: "UNION-FIND", VISITED: "VISITED", DISTANCE: "DIST", PARENT_TREE: "TREE",
            };
            const specialBadge = SPECIAL_BADGE_MAP[structure.kind] ?? null;

            return (
            <div key={structure.key} className="rounded border border-prova-line bg-[#0f141a] p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-[#9ac7ff] uppercase tracking-widest">{structure.key}</div>
                  {specialBadge && (
                    <span className="text-[8px] font-bold px-1.5 py-[2px] rounded border border-[#58a6ff]/30 bg-[#0c1f35] text-[#58a6ff] uppercase tracking-wider">
                      {specialBadge}
                    </span>
                  )}
                </div>
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
              {structure.kind === "HEAP" ? (
                <HeapTreeView
                  arr={structure.value as unknown[]}
                  stepState={stepState}
                  bitmaskMode={bitmaskMode}
                  bitWidth={bitWidth}
                />
              ) : structure.kind === "QUEUE" ? (
                <QueueView arr={structure.value as unknown[]} bitmaskMode={bitmaskMode} bitWidth={bitWidth} />
              ) : structure.kind === "STACK" ? (
                <StackView arr={structure.value as unknown[]} bitmaskMode={bitmaskMode} bitWidth={bitWidth} />
              ) : structure.kind === "DEQUE" ? (
                <DequeView arr={structure.value as unknown[]} bitmaskMode={bitmaskMode} bitWidth={bitWidth} />
              ) : structure.kind === "UNIONFIND" ? (
                <UnionFindView arr={structure.value as unknown[]} stepState={stepState} />
              ) : structure.kind === "VISITED" ? (
                <VisitedView arr={structure.value as unknown[]} />
              ) : structure.kind === "DISTANCE" ? (
                <DistanceView arr={structure.value as unknown[]} bitmaskMode={bitmaskMode} bitWidth={bitWidth} />
              ) : structure.kind === "PARENT_TREE" ? (
                <ParentTreeView arr={structure.value as unknown[]} stepState={stepState} />
              ) : (structure.kind === "ARRAY2D" || structure.kind === "GRAPHLIKE") && resolvedMode === "GRAPH" ? (
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
