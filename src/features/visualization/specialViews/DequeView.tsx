import { formatScalar } from "@/lib/formatValue";

export function DequeView({
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
