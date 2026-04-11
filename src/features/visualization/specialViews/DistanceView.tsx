import { formatScalar } from "@/lib/formatValue";

const INF_THRESHOLD = 1e8;

export function DistanceView({
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
