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
import {
  HeapTreeView,
  QueueView,
  StackView,
  DequeView,
  UnionFindView,
  VisitedView,
  DistanceView,
  ParentTreeView,
  BinaryTreeView,
  SegmentTreeView,
  type GraphStepState,
} from "./specialViews";
import {
  type GraphNode,
  type GraphLink,
  type SimNode,
  type SimLink,
  type LinkVisual,
  GRAPH_NODE_R,
  linkStyleForStep,
  nodePalette,
  shortenEdgeEndpoints,
  svgSafeId,
  GraphLegendOverlay,
  toNodeId,
  deriveGraphStepState,
  getSimLinkEndId,
  topologySignature,
} from "./graphHelpers";

type SpecialKind = "HEAP" | "QUEUE" | "STACK" | "DEQUE" | "UNIONFIND" | "VISITED" | "DISTANCE" | "PARENT_TREE" | "BINARY_TREE" | "SEGMENT_TREE";

/** 그래프가 구조적으로 트리인지 판별.
 *  다양한 케이스 처리:
 *  - 양방향 중복 엣지 (undirected: 각 엣지가 s→t, t→s 두 번 추가된 경우)
 *  - 방향 트리 (parent→child 방향만, 엣지 N-1개)
 *  - 1-indexed (노드 "0"이 실제 연결 없는 더미인 경우)
 */
function isStructuralTree(graph: { nodes: GraphNode[]; links: GraphLink[] }): boolean {
  if (graph.nodes.length === 0) return false;
  if (graph.nodes.length === 1) return true;

  // 무방향 유니크 엣지 집합 (s < t 기준으로 정규화하여 중복 제거)
  const undirectedEdges = new Set<string>();
  for (const l of graph.links) {
    const s = String(l.source), t = String(l.target);
    if (s === t) return false; // 셀프 루프 → 트리 아님
    undirectedEdges.add(s < t ? `${s}\0${t}` : `${t}\0${s}`);
  }

  // 실제로 연결된 노드만 (degree > 0) 집계 — 1-indexed에서 더미 노드 0 제외
  const connectedNodes = new Set<string>();
  for (const l of graph.links) {
    connectedNodes.add(String(l.source));
    connectedNodes.add(String(l.target));
  }
  const N = connectedNodes.size;
  if (N < 2) return false;
  if (undirectedEdges.size !== N - 1) return false;

  // BFS 연결성: 연결된 노드들이 모두 하나의 컴포넌트인지 확인
  const adj = new Map<string, string[]>();
  for (const n of connectedNodes) adj.set(n, []);
  for (const l of graph.links) {
    const s = String(l.source), t = String(l.target);
    adj.get(s)?.push(t);
    adj.get(t)?.push(s);
  }
  const startId = [...connectedNodes][0];
  const visited = new Set<string>([startId]);
  const queue: string[] = [startId];
  while (queue.length > 0) {
    for (const nb of adj.get(queue.shift()!)!) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
    }
  }
  return visited.size === N;
}

/** BFS depth + subtree-width 기반 계층형 레이아웃 */
function computeTreeLayout(
  graph: { nodes: GraphNode[]; links: GraphLink[] },
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const l of graph.links) {
    const s = String(l.source), t = String(l.target);
    adj.get(s)?.push(t);
    adj.get(t)?.push(s);
  }
  // 실제 연결된 노드만 사용 (1-indexed 더미 노드 0 제외)
  const connectedNodes = new Set<string>();
  for (const l of graph.links) {
    connectedNodes.add(String(l.source));
    connectedNodes.add(String(l.target));
  }

  // 루트: degree가 가장 높은 노드 (없으면 첫 노드)
  const rootId = [...adj.entries()]
    .filter(([id]) => connectedNodes.has(id))
    .sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? graph.nodes[0].id;

  type TNode = { id: string; children: string[]; depth: number };
  const tNodes = new Map<string, TNode>();
  for (const n of graph.nodes) tNodes.set(n.id, { id: n.id, children: [], depth: 0 });

  const visited = new Set<string>([rootId]);
  const bfsQ: string[] = [rootId];
  while (bfsQ.length > 0) {
    const cur = bfsQ.shift()!;
    for (const nb of adj.get(cur) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        tNodes.get(nb)!.depth = tNodes.get(cur)!.depth + 1;
        tNodes.get(cur)!.children.push(nb);
        bfsQ.push(nb);
      }
    }
  }

  const maxDepth = Math.max(...[...tNodes.values()].map((n) => n.depth));
  const V_GAP = Math.min(80, (height - 60) / Math.max(maxDepth, 1));

  function leafCount(id: string): number {
    const ch = tNodes.get(id)!.children;
    return ch.length === 0 ? 1 : ch.reduce((s, c) => s + leafCount(c), 0);
  }

  const positions = new Map<string, { x: number; y: number }>();
  function assignX(id: string, left: number, right: number) {
    positions.set(id, { x: (left + right) / 2, y: tNodes.get(id)!.depth * V_GAP + 40 });
    const children = tNodes.get(id)!.children;
    const total = leafCount(id);
    let cur = left;
    for (const child of children) {
      const share = ((right - left) * leafCount(child)) / total;
      assignX(child, cur, cur + share);
      cur += share;
    }
  }
  assignX(rootId, 20, width - 20);
  return positions;
}

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
  /** AI 분류가 트리 알고리즘임을 나타내는 힌트 (tags/detected_algorithms 기반) */
  isTreeHint?: boolean;
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



function formatDirectionVectorList(value: unknown[][]): string {
  const body = value.map((row) => `(${String(row[0])}, ${String(row[1])})`).join(", ");
  return `[${body}]`;
}

// ── Special Views are in ./specialViews/ ─────────────────────────────────────


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
  stepState,
  useTreeLayout = false,
}: {
  graphKey: string;
  graph: { nodes: GraphNode[]; links: GraphLink[] };
  graphMode: "directed" | "undirected";
  positionRef: React.MutableRefObject<Map<string, { x: number; y: number; vx?: number; vy?: number }>>;
  stepState: GraphStepState;
  useTreeLayout?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const layoutSignatureRef = useRef<Map<string, string>>(new Map());
  const simRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const graphSignature = useMemo(() => topologySignature(graph), [graph]);

  // ── Tree layout (static, no D3 force) ───────────────────────────────────────
  useEffect(() => {
    if (!useTreeLayout) return;
    const svgEl = svgRef.current;
    const wrap = wrapRef.current;
    if (!svgEl || !wrap) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    if (graph.nodes.length === 0) return;

    const width = Math.max(wrap.clientWidth, 260);
    const height = Math.max(320, Math.round(Math.max(wrap.clientHeight, 220) * 0.62));
    svg.attr("viewBox", `0 0 ${width} ${height}`).style("overflow", "visible");

    const positions = computeTreeLayout(graph, width, height);
    const arrowId = `graph-arrow-tree-${svgSafeId(graphKey)}`;
    const root = svg.append("g");
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on("zoom", (e) => {
      root.attr("transform", e.transform);
    });
    svg.call(zoomBehavior);

    const defs = svg.append("defs");
    defs.append("marker").attr("id", arrowId)
      .attr("viewBox", "0 0 10 10").attr("markerWidth", 10).attr("markerHeight", 10)
      .attr("markerUnits", "userSpaceOnUse").attr("refX", 9).attr("refY", 5).attr("orient", "auto")
      .append("path").attr("d", "M0,0 L10,5 L0,10 z").attr("fill", "#a8cfff");

    // edges
    root.append("g").selectAll("line").data(graph.links).join("line")
      .attr("x1", (d) => positions.get(String(d.source))?.x ?? 0)
      .attr("y1", (d) => positions.get(String(d.source))?.y ?? 0)
      .attr("x2", (d) => positions.get(String(d.target))?.x ?? 0)
      .attr("y2", (d) => positions.get(String(d.target))?.y ?? 0)
      .attr("stroke", (d) => linkStyleForStep(stepState, String(d.source), String(d.target)).stroke)
      .attr("stroke-width", (d) => linkStyleForStep(stepState, String(d.source), String(d.target)).width)
      .attr("stroke-opacity", (d) => linkStyleForStep(stepState, String(d.source), String(d.target)).opacity)
      .attr("marker-end", graphMode === "directed" ? `url(#${arrowId})` : null);

    // edge weight labels
    root.append("g").selectAll("text").data(graph.links.filter((l) => !!l.weight)).join("text")
      .attr("x", (d) => ((positions.get(String(d.source))?.x ?? 0) + (positions.get(String(d.target))?.x ?? 0)) / 2)
      .attr("y", (d) => ((positions.get(String(d.source))?.y ?? 0) + (positions.get(String(d.target))?.y ?? 0)) / 2 - 8)
      .attr("fill", "#f2cc60").attr("font-size", 11).attr("font-weight", 700)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("paint-order", "stroke").attr("stroke", "#0b1119").attr("stroke-width", 3.2)
      .text((d) => d.weight ?? "");

    // nodes
    const nodeSel = root.append("g").selectAll<SVGGElement, GraphNode>("g")
      .data(graph.nodes).join("g")
      .attr("transform", (d) => {
        const p = positions.get(d.id);
        return `translate(${p?.x ?? 0},${p?.y ?? 0})`;
      });
    nodeSel.append("circle").attr("r", GRAPH_NODE_R)
      .attr("fill", (d) => nodePalette(stepState, d.id).fill)
      .attr("stroke", (d) => nodePalette(stepState, d.id).stroke)
      .attr("stroke-width", (d) => nodePalette(stepState, d.id).sw);
    nodeSel.append("text")
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("fill", "#e6edf3").attr("font-size", 11).attr("font-weight", 700)
      .text((d) => d.label);
  }, [useTreeLayout, graphKey, graphMode, graphSignature, graph, stepState]);

  // ── D3 Force layout ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (useTreeLayout) return;
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
  }, [useTreeLayout, graphKey, graphMode, positionRef, graphSignature]);

  useEffect(() => {
    if (useTreeLayout) return; // 트리 레이아웃은 위 useEffect에서 stepState 포함해 전체 재렌더
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
  isTreeHint = false,
  playbackControls
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef<Map<string, { x: number; y: number; vx?: number; vy?: number }>>(new Map());
  const [array2DModeByVar, setArray2DModeByVar] = useState<Record<string, "GRID" | "GRAPH">>({});
  const [treeLayoutByVar, setTreeLayoutByVar] = useState<Record<string, boolean>>({});
  const stepState = useMemo(() => deriveGraphStepState(step?.vars ?? {}), [step]);
  // specialVarKindsProp이 undefined일 때 매 렌더마다 새 {}를 만들지 않도록 안정화
  const specialVarKinds = specialVarKindsProp ?? EMPTY_SPECIAL_VAR_KINDS;

  // traceSteps가 바뀔 때(새 실행)만 재계산 — 매 스텝마다 O(n) 재스캔하지 않도록 분리
  const stickyVarsByStep = useMemo(() => {
    if (traceSteps.length === 0) return [] as Array<Record<string, unknown>>;
    const result: Array<Record<string, unknown>> = [];
    const acc: Record<string, unknown> = {};
    for (const s of traceSteps) {
      Object.entries(s.vars ?? {}).forEach(([k, v]) => {
        if (isRenderableStructure(v)) acc[k] = v;
      });
      result.push({ ...acc });
    }
    return result;
  }, [traceSteps]);

  const parsed = useMemo(() => {
    if (!step) return null;
    const currentVars = step.vars ?? {};

    // O(1) 조회: 현재 step index 기준으로 사전 계산된 sticky vars 사용
    const stepIndex = step.step ?? 0;
    const stickyRenderableVars =
      stickyVarsByStep.length > 0
        ? (stickyVarsByStep[stepIndex] ?? stickyVarsByStep.at(-1) ?? {})
        : currentVars;
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
      if (detectGraphLike(value) && /graph|adj|edge|matrix|tree/i.test(name)) {
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
        // buildGraphFromValue를 JSX 인라인에서 useMemo 안으로 이동
        const graph =
          kind === "ARRAY2D" || kind === "GRAPHLIKE"
            ? buildGraphFromValue(value)
            : null;
        return { key, value, kind: kind as "ARRAY2D" | "ARRAY1D" | "OBJECT" | "GRAPHLIKE" | SpecialKind, graph };
      });

    return { graphKeys, structures };
  }, [graphVarName, graphVarNames, step, stickyVarsByStep, specialVarKinds]);

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
            const SPECIAL_KINDS: ReadonlySet<string> = new Set(["HEAP","QUEUE","STACK","DEQUE","UNIONFIND","VISITED","DISTANCE","PARENT_TREE","BINARY_TREE","SEGMENT_TREE"]);
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
            // isTreeHint일 때는 변수명 무관하게 GRAPHLIKE → GRAPH 기본값
            const default2dMode =
              (parsed.graphKeys.has(structure.key) || (isTreeHint && structure.kind === "GRAPHLIKE"))
              && !preferGridDefault ? "GRAPH" : "GRID";
            const resolvedMode = lockGridOnly
              ? "GRID"
              : !canToggleGraphGrid && structure.kind === "GRAPHLIKE"
              ? "GRAPH"
              : (array2DModeByVar[structure.key] ?? default2dMode);

            const SPECIAL_BADGE_MAP: Partial<Record<string, string>> = {
              HEAP: "HEAP", QUEUE: "QUEUE", STACK: "STACK", DEQUE: "DEQUE",
              UNIONFIND: "UNION-FIND", VISITED: "VISITED", DISTANCE: "DIST", PARENT_TREE: "TREE",
              BINARY_TREE: "BIN-TREE", SEGMENT_TREE: "SEG-TREE",
            };
            const specialBadge = SPECIAL_BADGE_MAP[structure.kind] ?? null;

            const graphForThisKey = structure.graph ?? { nodes: [], links: [] };
            const structurallyTree = isStructuralTree(graphForThisKey);
            // GRAPHLIKE면 항상 토글 노출. 기본값: 구조적 트리 + AI 트리 힌트면 TREE, 아니면 FORCE
            const canToggleTreeLayout = resolvedMode === "GRAPH" && !isSpecial;
            const defaultTreeLayout = structurallyTree && isTreeHint;
            const useTreeLayout = canToggleTreeLayout && (treeLayoutByVar[structure.key] ?? defaultTreeLayout);

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
                <div className="flex items-center gap-1">
                  {canToggleTreeLayout && (
                    <div className="inline-flex items-center rounded border border-prova-line overflow-hidden text-[10px] font-mono">
                      <button
                        className={`px-2 py-[2px] ${useTreeLayout ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`}
                        onClick={() => setTreeLayoutByVar((prev) => ({ ...prev, [structure.key]: true }))}
                      >
                        TREE
                      </button>
                      <button
                        className={`px-2 py-[2px] border-l border-prova-line ${!useTreeLayout ? "bg-[#21262d] text-white" : "text-prova-muted hover:text-[#c9d1d9]"}`}
                        onClick={() => setTreeLayoutByVar((prev) => ({ ...prev, [structure.key]: false }))}
                      >
                        FORCE
                      </button>
                    </div>
                  )}
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
              ) : structure.kind === "BINARY_TREE" ? (
                <BinaryTreeView
                  arr={structure.value as unknown[]}
                  stepState={stepState}
                  bitmaskMode={bitmaskMode}
                  bitWidth={bitWidth}
                />
              ) : structure.kind === "SEGMENT_TREE" ? (
                <SegmentTreeView
                  arr={structure.value as unknown[]}
                  stepState={stepState}
                  bitmaskMode={bitmaskMode}
                  bitWidth={bitWidth}
                />
              ) : (structure.kind === "ARRAY2D" || structure.kind === "GRAPHLIKE") && resolvedMode === "GRAPH" ? (
                <GraphCanvas
                  graphKey={structure.key}
                  graph={graphForThisKey}
                  graphMode={graphMode}
                  positionRef={positionRef}
                  stepState={stepState}
                  useTreeLayout={useTreeLayout}
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
