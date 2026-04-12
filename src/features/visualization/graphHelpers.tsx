import * as d3 from "d3";
import { toFiniteNumber } from "@/lib/formatValue";
import type { GraphStepState } from "./specialViews/types";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type GraphNode = { id: string; label: string };
export type GraphLink = { source: string; target: string; weight?: string };
export type SimNode = GraphNode & d3.SimulationNodeDatum;
export type SimLink = d3.SimulationLinkDatum<SimNode> & { weight?: string };
export type LinkVisual = { stroke: string; width: number; dash: string; opacity: number };

// ── 상수 ──────────────────────────────────────────────────────────────────────

export const GRAPH_NODE_R = 17;

// ── 스타일 ────────────────────────────────────────────────────────────────────

export function linkStyleForStep(st: GraphStepState, s: string, t: string): LinkVisual {
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

export function nodePalette(st: GraphStepState, id: string): { fill: string; stroke: string; sw: number } {
  if (st.currentNode === id) return { fill: "#4a3512", stroke: "#f2cc60", sw: 2.85 };
  if (st.frontierNodes.has(id)) return { fill: "#2f1f4f", stroke: "#b28cff", sw: 2.25 };
  if (st.orderedNodes.has(id)) return { fill: "#134e4a", stroke: "#5eead4", sw: 2.35 };
  if (st.visitedNodes.has(id)) return { fill: "#113a2b", stroke: "#58d68d", sw: 2.2 };
  return { fill: "#1b2b42", stroke: "#85c2ff", sw: 2.1 };
}

// ── SVG 유틸 ──────────────────────────────────────────────────────────────────

export function shortenEdgeEndpoints(
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

export function svgSafeId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ── 노드/상태 추출 ───────────────────────────────────────────────────────────

export function toNodeId(value: unknown): string | null {
  const n = toFiniteNumber(value);
  if (n !== null) return String(Math.trunc(n));
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

export function pushVisitedFromValue(out: Set<string>, value: unknown) {
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

export function extractResultOrder(vars: Record<string, unknown>): string[] {
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

export function deriveGraphStepState(vars: Record<string, unknown>): GraphStepState {
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

// ── 그래프 토폴로지 ──────────────────────────────────────────────────────────

export function getSimLinkEndId(end: string | number | SimNode): string {
  if (typeof end === "string" || typeof end === "number") return String(end);
  return end.id;
}

export function topologySignature(graph: { nodes: GraphNode[]; links: GraphLink[] }) {
  const ns = graph.nodes.map((n) => n.id).sort().join(",");
  const ls = graph.links
    .map((l) => `${l.source}->${l.target}:${l.weight ?? ""}`)
    .sort()
    .join("|");
  return `${ns}__${ls}`;
}

// ── 범례 컴포넌트 ────────────────────────────────────────────────────────────

export function GraphLegendOverlay({
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
