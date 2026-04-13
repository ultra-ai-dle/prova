import { useState } from "react";
import type { ExampleItem, ExampleVariant } from "@/data/examples";
import { useT } from "@/i18n";
import { useLocaleStore } from "@/store/useLocaleStore";

const LANG_LABELS: Record<string, string> = {
  python: "Py",
  javascript: "JS",
  java: "Java",
};

interface ExampleCardProps {
  example: ExampleItem;
  onSelect: (example: ExampleItem, variant: ExampleVariant) => void;
}

export function ExampleCard({ example, onSelect }: ExampleCardProps) {
  const [langIdx, setLangIdx] = useState(0);
  const variant = example.variants[langIdx];
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);

  const primaryTitle = locale === "en" ? example.title : example.titleKo;
  const secondaryTitle = locale === "en" ? example.titleKo : example.title;

  return (
    <button
      className="text-left rounded-lg border border-prova-line bg-[#161b22] p-3 hover:border-[#58a6ff]/50 hover:bg-[#1c2128] transition-colors cursor-pointer"
      title={example.tags.join(", ")}
      onClick={() => onSelect(example, variant)}
    >
      <div className="text-[13px] font-semibold text-[#e6edf3] truncate">
        {primaryTitle}
      </div>
      <div className="text-[11px] text-prova-muted mt-0.5 truncate">
        {secondaryTitle}
      </div>

      {/* Language toggle — only if more than 1 variant */}
      {example.variants.length > 1 && (
        <div className="flex items-center gap-1 mt-2">
          {example.variants.map((v, i) => (
            <span
              key={v.language}
              role="button"
              tabIndex={0}
              className={`text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                i === langIdx
                  ? "bg-[#1f3a5f] text-[#58a6ff] border border-[#58a6ff]/50"
                  : "bg-[#21262d] text-prova-muted border border-transparent hover:text-[#c9d1d9]"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setLangIdx(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  setLangIdx(i);
                }
              }}
            >
              {LANG_LABELS[v.language] ?? v.language}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            example.difficulty === "easy"
              ? "bg-[#0d4429]/60 text-[#3fb950]"
              : "bg-[#3d2b00]/60 text-[#e3b341]"
          }`}
        >
          {example.difficulty === "easy" ? t.gallery_difficulty_easy : t.gallery_difficulty_medium}
        </span>
      </div>
    </button>
  );
}
