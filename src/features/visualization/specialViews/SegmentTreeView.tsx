"use client";

import { useMemo } from "react";
import { formatScalar } from "@/lib/formatValue";
import type { GraphStepState } from "./types";

const NODE_R = 18;
const V_GAP = 62;

function computePositions(n: number): Array<{ x: number; y: number }> {
  const capped = Math.min(n, 63);
  const maxLevel = Math.floor(Math.log2(Math.max(capped, 1)));
  const leafCount = Math.pow(2, maxLevel);
  const H_UNIT = 48;
  const totalW = leafCount * H_UNIT;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < capped; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const levelStart = Math.pow(2, level) - 1;
    const posInLevel = i - levelStart;
    const levelCount = Math.pow(2, level);
    out.push({
      x: ((posInLevel + 0.5) / levelCount) * totalW,
      y: level * V_GAP + NODE_R + 12,
    });
  }
  return out;
}

/**
 * 세그먼트 트리의 각 노드(1-indexed)가 커버하는 구간 [l, r]을 계산한다.
 * n: 원본 배열 크기 (추정값)
 */
function computeRanges(n: number, treeSize: number): Array<[number, number] | null> {
  const ranges: Array<[number, number] | null> = new Array(treeSize + 1).fill(null);
  function build(node: number, l: number, r: number) {
    if (node > treeSize) return;
    ranges[node] = [l, r];
    if (l === r) return;
    const mid = (l + r) >> 1;
    build(2 * node, l, mid);
    build(2 * node + 1, mid + 1, r);
  }
  build(1, 0, n - 1);
  return ranges;
}

export function SegmentTreeView({
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
  // 세그먼트 트리는 보통 1-indexed (index 0 비어있음)
  // arr.length ≈ 4*n → n ≈ floor(arr.length / 4)
  const isOneIndexed = arr[0] === 0 || arr[0] === null || arr[0] === undefined;
  const data = isOneIndexed ? arr.slice(1) : arr;
  const capped = Math.min(data.length, 63);

  const inferredN = useMemo(() => {
    // 원본 배열 크기 추정: 트리 크기가 4n이므로 n = ceil(treeSize / 4)
    const treeSize = isOneIndexed ? arr.length - 1 : arr.length;
    return Math.max(1, Math.ceil(treeSize / 4));
  }, [arr.length, isOneIndexed]);

  const positions = useMemo(() => computePositions(capped), [capped]);
  const ranges = useMemo(() => computeRanges(inferredN, capped), [inferredN, capped]);

  if (positions.length === 0) return null;

  const maxLevel = Math.floor(Math.log2(Math.max(capped, 1)));
  const leafCount = Math.pow(2, maxLevel);
  const svgW = Math.max(leafCount * 48, 96);
  const svgH = (maxLevel + 1) * V_GAP + NODE_R + 32;

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW, display: "block" }}>
        {/* edges */}
        {positions.map((pos, i) => {
          if (i === 0) return null;
          const pPos = positions[Math.floor((i - 1) / 2)];
          return (
            <line
              key={`ste-${i}`}
              x1={pPos.x} y1={pPos.y}
              x2={pos.x} y2={pos.y}
              stroke="#2d4050" strokeWidth={1.5}
            />
          );
        })}
        {/* nodes */}
        {positions.map((pos, i) => {
          const v = data[i];
          const label = formatScalar(v, bitmaskMode, bitWidth);
          const nodeIdx1 = i + 1; // 1-indexed node number
          const range = ranges[nodeIdx1];
          const nid = String(nodeIdx1);
          const cur = stepState.currentNode === nid;
          const frt = stepState.frontierNodes.has(nid);
          const vis = stepState.visitedNodes.has(nid);
          const fill = cur ? "#1a2a3a" : frt ? "#1f2f40" : vis ? "#0f2a1e" : "#152030";
          const stroke = cur ? "#38bdf8" : frt ? "#60a5fa" : vis ? "#34d399" : "#3d6080";
          const rangeLabel = range ? `[${range[0]}..${range[1]}]` : "";
          return (
            <g key={`stn-${i}`} transform={`translate(${pos.x},${pos.y})`}>
              <circle r={NODE_R} fill={fill} stroke={stroke} strokeWidth={cur ? 2.8 : 1.8} />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#e6edf3"
                fontSize={9}
                fontWeight={700}
                fontFamily="monospace"
              >
                {label}
              </text>
              {/* range label below node */}
              {rangeLabel && (
                <text
                  y={NODE_R + 11}
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize={7}
                  fontFamily="monospace"
                >
                  {rangeLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {data.length > 63 && (
        <div className="text-[10px] text-prova-muted mt-1">
          +{data.length - 63} 노드 생략
        </div>
      )}
    </div>
  );
}
