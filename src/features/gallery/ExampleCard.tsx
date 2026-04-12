import type { ExampleItem } from "@/data/examples";

interface ExampleCardProps {
  example: ExampleItem;
  onSelect: (example: ExampleItem) => void;
}

export function ExampleCard({ example, onSelect }: ExampleCardProps) {
  return (
    <button
      className="text-left rounded-lg border border-prova-line bg-[#161b22] p-3 hover:border-[#58a6ff]/50 hover:bg-[#1c2128] transition-colors cursor-pointer"
      onClick={() => onSelect(example)}
    >
      <div className="text-[13px] font-semibold text-[#e6edf3] truncate">
        {example.title}
      </div>
      <div className="text-[11px] text-prova-muted mt-0.5 truncate">
        {example.titleKo}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            example.difficulty === "easy"
              ? "bg-[#0d4429]/60 text-[#3fb950]"
              : "bg-[#3d2b00]/60 text-[#e3b341]"
          }`}
        >
          {example.difficulty === "easy" ? "Easy" : "Medium"}
        </span>
        {example.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[10px] text-prova-muted bg-[#21262d] px-1.5 py-0.5 rounded-full"
          >
            #{tag}
          </span>
        ))}
      </div>
    </button>
  );
}
