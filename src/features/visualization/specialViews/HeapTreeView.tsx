import { useMemo } from "react";
import { toFiniteNumber, formatScalar } from "@/lib/formatValue";
import type { GraphStepState } from "./types";

const HEAP_NODE_R = 16;
const HEAP_V_GAP = 54;
const HEAP_NODE_PAD_X = 8;

function toNodeId(value: unknown): string | null {
  const n = toFiniteNumber(value);
  if (n !== null) return String(Math.trunc(n));
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function objectEntries(value: unknown): Array<[string, unknown]> | null {
  const rec = asRecord(value);
  if (!rec) return null;
  return Object.entries(rec).filter(([k]) => k.trim().length > 0 && k !== "__class");
}

function objectClassName(value: unknown): string | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const className = rec.__class;
  return typeof className === "string" && className.trim().length > 0 ? className.trim() : null;
}

function objectCompactLabel(value: unknown): string | null {
  const entries = objectEntries(value);
  if (!entries || entries.length === 0) return null;
  // 하드코딩된 키 없이 객체의 모든 필드를 동적으로 표시
  return entries.map(([, v]) => formatScalar(v)).join("|");
}

function objectTooltip(value: unknown): string | null {
  const entries = objectEntries(value);
  if (!entries || entries.length === 0) return null;
  const className = objectClassName(value) ?? "Object";
  const body = entries.map(([k, v]) => `${k}: ${formatScalar(v)}`).join(", ");
  return `${className} { ${body} }`;
}

function estimateLabelWidthPx(label: string): number {
  // fontSize=9 + monospace 기준 대략 폭 추정
  return label.length * 5.6;
}

function computeHeapPositions(n: number, hUnit: number): Array<{ x: number; y: number }> {
  const capped = Math.min(n, 63);
  const maxLevel = Math.floor(Math.log2(Math.max(capped, 1)));
  const leafCount = Math.pow(2, maxLevel);
  const totalW = leafCount * hUnit;
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

export function HeapTreeView({
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

  const getLabel = (v: unknown) => {
    if (Array.isArray(v) && v.length >= 2) return `${v[0]}|${v[1]}`;
    const objLabel = objectCompactLabel(v);
    if (objLabel) return objLabel;
    return formatScalar(v, bitmaskMode, bitWidth);
  };
  const getNodeId = (v: unknown, i: number) => {
    if (Array.isArray(v) && v.length >= 2) return toNodeId(v[1]) ?? String(i);
    return toNodeId(v) ?? String(i);
  };

  const getTooltip = (v: unknown) => {
    const objTip = objectTooltip(v);
    if (objTip) return objTip;
    if (Array.isArray(v) && v.length >= 2) return `[${String(v[0])}, ${String(v[1])}]`;
    if (typeof v === "object" && v !== null) {
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  const labels = useMemo(
    () => Array.from({ length: capped }, (_, i) => getLabel(arr[i])),
    [arr, capped, bitmaskMode, bitWidth],
  );
  const maxLabelWidth = useMemo(
    () => labels.reduce((m, label) => Math.max(m, estimateLabelWidthPx(label)), 0),
    [labels],
  );
  const nodeHalfWidth = Math.max(HEAP_NODE_R, Math.ceil(maxLabelWidth / 2) + HEAP_NODE_PAD_X);
  const hUnit = Math.max(nodeHalfWidth * 2 + 12, 40);
  const positions = useMemo(() => computeHeapPositions(capped, hUnit), [capped, hUnit]);

  if (positions.length === 0) return null;

  const maxLevel = Math.floor(Math.log2(Math.max(capped, 1)));
  const leafCount = Math.pow(2, maxLevel);
  const svgW = Math.max(leafCount * hUnit, nodeHalfWidth * 2 + 48);
  const svgH = (maxLevel + 1) * HEAP_V_GAP + HEAP_NODE_R + 24;

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
              <title>{getTooltip(v)}</title>
              <rect
                x={-nodeHalfWidth}
                y={-HEAP_NODE_R}
                width={nodeHalfWidth * 2}
                height={HEAP_NODE_R * 2}
                rx={HEAP_NODE_R}
                ry={HEAP_NODE_R}
                fill={fill}
                stroke={stroke}
                strokeWidth={cur ? 2.8 : 1.8}
              />
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
