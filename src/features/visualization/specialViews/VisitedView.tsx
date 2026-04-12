export function VisitedView({
  arr,
}: {
  arr: unknown[];
}) {
  if (arr.length === 0) {
    return <div className="text-[11px] text-prova-muted font-mono py-1">(비어있음)</div>;
  }
  return (
    <div className="flex items-start gap-1 overflow-auto py-2 flex-wrap">
      {arr.map((v, i) => {
        const visited = v === true || v === 1 || v === "True";
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="text-[10px] text-prova-muted font-mono">{i}</div>
            <div
              className={`w-7 h-7 rounded border text-[10px] font-mono grid place-items-center ${
                visited
                  ? "border-[#58d68d] bg-[#0e2b1e] text-[#7ae2a8]"
                  : "border-[#2a2f36] bg-[#0d1117] text-[#4a5568]"
              }`}
              title={visited ? "visited" : "not visited"}
            >
              {visited ? "✓" : "·"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
