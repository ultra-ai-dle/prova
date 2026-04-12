import { useMemo } from "react";
import type { GraphStepState } from "./types";

export function buildUFForest(arr: unknown[]): { children: number[][]; roots: number[] } {
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

export function layoutUFForest(roots: number[], children: number[][]): Map<number, { x: number; y: number }> {
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

export function UnionFindView({
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
