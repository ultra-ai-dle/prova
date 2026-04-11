import { useMemo } from "react";
import type { GraphStepState } from "./types";
import { layoutUFForest } from "./UnionFindView";

export function ParentTreeView({
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
