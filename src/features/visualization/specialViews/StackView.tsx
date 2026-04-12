import { formatScalar } from "@/lib/formatValue";

export function StackView({
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
