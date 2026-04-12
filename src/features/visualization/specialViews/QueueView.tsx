import { formatScalar } from "@/lib/formatValue";

export function QueueView({
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
    <div className="py-2 px-1 space-y-2">
      {/* 파이프 몸통 */}
      <div className="flex items-stretch overflow-auto">
        {/* DEQUEUE 출구 (왼쪽) */}
        <div className="flex flex-col items-center justify-center shrink-0 mr-1">
          <div className="text-[8px] text-[#58d68d] font-mono font-bold mb-1">DEQUEUE</div>
          <svg width={20} height={36} viewBox="0 0 20 36">
            <path d="M16,18 L4,18 M8,10 L4,18 L8,26" stroke="#58d68d" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* 파이프 상단 라인 */}
        <div className="flex flex-col justify-between">
          <div className="h-[1px] bg-[#2d4f79] w-full" />
          <div className="flex items-center gap-0">
            {arr.length === 0 ? (
              <div className="h-10 px-6 border-y border-[#2d4f79] bg-[#0a1520] text-[11px] text-prova-muted font-mono flex items-center">empty</div>
            ) : arr.map((v, i) => {
              const isFront = i === 0;
              const isBack = i === arr.length - 1;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`h-10 min-w-[38px] px-2 border-y border-r text-[11px] font-mono flex flex-col items-center justify-center gap-0.5
                      ${isFront ? "border-[#58d68d] bg-[#091f14]" : isBack ? "border-[#b28cff] bg-[#110a22]" : "border-[#2d4f79] bg-[#0a1520]"}
                      ${i === 0 ? "border-l" : ""}`}
                  >
                    <span className={`font-bold ${isFront ? "text-[#58d68d]" : isBack ? "text-[#b28cff]" : "text-[#c9d1d9]"}`}>
                      {getLabel(v)}
                    </span>
                    {(isFront || isBack) && (
                      <span className={`text-[7px] font-bold leading-none ${isFront ? "text-[#58d68d]/70" : "text-[#b28cff]/70"}`}>
                        {isFront && isBack ? "FRONT=BACK" : isFront ? "FRONT" : "BACK"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-[1px] bg-[#2d4f79] w-full" />
        </div>
        {/* ENQUEUE 입구 (오른쪽) */}
        <div className="flex flex-col items-center justify-center shrink-0 ml-1">
          <div className="text-[8px] text-[#b28cff] font-mono font-bold mb-1">ENQUEUE</div>
          <svg width={20} height={36} viewBox="0 0 20 36">
            <path d="M4,18 L16,18 M12,10 L16,18 L12,26" stroke="#b28cff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {/* 인덱스 */}
      {arr.length > 0 && (
        <div className="flex pl-[28px] gap-0">
          {arr.map((_, i) => (
            <div key={i} className="min-w-[38px] text-center text-[9px] text-prova-muted font-mono">{i}</div>
          ))}
        </div>
      )}
    </div>
  );
}
