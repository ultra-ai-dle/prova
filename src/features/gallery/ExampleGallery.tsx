import { useEffect, useCallback, useMemo } from "react";
import { CATEGORIES, EXAMPLES } from "@/data/examples";
import type { ExampleCategory, ExampleItem, ExampleVariant } from "@/data/examples";
import { ExampleCard } from "./ExampleCard";

interface ExampleGalleryProps {
  isOpen: boolean;
  selectedCategory: ExampleCategory;
  confirmTarget: ExampleItem | null;
  onClose: () => void;
  onSelectCategory: (cat: ExampleCategory) => void;
  onRequestConfirm: (example: ExampleItem, variant: ExampleVariant) => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
}

export function ExampleGallery({
  isOpen,
  selectedCategory,
  confirmTarget,
  onClose,
  onSelectCategory,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
}: ExampleGalleryProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmTarget) {
          onCancelConfirm();
        } else {
          onClose();
        }
      }
    },
    [confirmTarget, onCancelConfirm, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const filtered = useMemo(
    () =>
      EXAMPLES.filter(
        (e) => e.category === selectedCategory && e.featured,
      ),
    [selectedCategory],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] bg-[#0d1117] border border-prova-line rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-prova-line">
          <span className="text-[14px] font-semibold text-[#e6edf3]">
            예제 갤러리
          </span>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-prova-muted hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Category sidebar */}
          <nav className="shrink-0 w-32 border-r border-prova-line py-2 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`w-full text-left px-4 py-2 text-[12px] transition-colors ${
                  selectedCategory === cat.key
                    ? "text-[#e6edf3] bg-[#1c2128] font-semibold"
                    : "text-prova-muted hover:text-[#c9d1d9] hover:bg-[#161b22]"
                }`}
                onClick={() => onSelectCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </nav>

          {/* Card grid or confirm dialog */}
          <div className="flex-1 p-4 overflow-y-auto prova-scrollbar">
            {confirmTarget ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center">
                  <p className="text-[13px] text-[#e6edf3] mb-1">
                    현재 코드를 덮어쓸까요?
                  </p>
                  <p className="text-[11px] text-prova-muted mb-4">
                    &ldquo;{confirmTarget.title}&rdquo; 예제로 교체됩니다.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      className="px-4 py-1.5 text-[12px] rounded-md border border-prova-line text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                      onClick={onCancelConfirm}
                    >
                      취소
                    </button>
                    <button
                      className="px-4 py-1.5 text-[12px] rounded-md bg-[#238636] text-white hover:bg-[#2ea043] transition-colors font-medium"
                      onClick={onConfirm}
                    >
                      확인
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((ex) => (
                  <ExampleCard
                    key={ex.id}
                    example={ex}
                    onSelect={onRequestConfirm}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center text-[12px] text-prova-muted py-8">
                    해당 카테고리에 예제가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-2 border-t border-prova-line text-[10px] text-prova-muted">
          Python · JavaScript 지원 | 선택하면 에디터에 로드
        </div>
      </div>
    </div>
  );
}
