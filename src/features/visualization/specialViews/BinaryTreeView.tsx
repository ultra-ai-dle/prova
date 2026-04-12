"use client";

import { useMemo } from "react";
import { formatScalar } from "@/lib/formatValue";
import type { GraphStepState } from "./types";

const NODE_R = 16;
const V_GAP = 54;

function computePositions(n: number): Array<{ x: number; y: number }> {
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
      y: level * V_GAP + NODE_R + 8,
    });
  }
  return out;
}

export function BinaryTreeView({
  arr,
  stepState,
  bitmaskMode,
  bitWidth,
  /** 1-indexed 배열이면 true (인덱스 0 무시). 기본 false (0-indexed). */
  oneIndexed = false,
}: {
  arr: unknown[];
  stepState: GraphStepState;
  bitmaskMode?: boolean;
  bitWidth?: number;
  oneIndexed?: boolean;
}) {
  const data = oneIndexed ? arr.slice(1) : arr;
  const capped = Math.min(data.length, 63);
  const positions = useMemo(() => computePositions(capped), [capped]);

  if (positions.length === 0) return null;

  const maxLevel = Math.floor(Math.log2(Math.max(capped, 1)));
  const leafCount = Math.pow(2, maxLevel);
  const svgW = Math.max(leafCount * 40, 80);
  const svgH = (maxLevel + 1) * V_GAP + NODE_R + 24;

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ minWidth: svgW, display: "block" }}>
        {/* edges */}
        {positions.map((pos, i) => {
          if (i === 0) return null;
          const pPos = positions[Math.floor((i - 1) / 2)];
          return (
            <line
              key={`bte-${i}`}
              x1={pPos.x} y1={pPos.y}
              x2={pos.x} y2={pos.y}
              stroke="#2d4468" strokeWidth={1.5}
            />
          );
        })}
        {/* nodes */}
        {positions.map((pos, i) => {
          const v = data[i];
          const label = formatScalar(v, bitmaskMode, bitWidth);
          const displayIdx = oneIndexed ? i + 1 : i;
          // stepState는 값 기반 (heapq처럼 node id가 값인 경우)
          const nid = String(v);
          const cur = stepState.currentNode === nid;
          const frt = stepState.frontierNodes.has(nid);
          const vis = stepState.visitedNodes.has(nid);
          const fill = cur ? "#1a3a1a" : frt ? "#2f1f4f" : vis ? "#113a2b" : "#1b2b42";
          const stroke = cur ? "#4ade80" : frt ? "#b28cff" : vis ? "#58d68d" : "#558bb5";
          return (
            <g key={`btn-${i}`} transform={`translate(${pos.x},${pos.y})`}>
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
              <text y={NODE_R + 10} textAnchor="middle" fill="#4a5568" fontSize={8} fontFamily="monospace">
                [{displayIdx}]
              </text>
            </g>
          );
        })}
      </svg>
      {arr.length > (oneIndexed ? 64 : 63) && (
        <div className="text-[10px] text-prova-muted mt-1">
          +{arr.length - (oneIndexed ? 64 : 63)} 노드 생략
        </div>
      )}
    </div>
  );
}
