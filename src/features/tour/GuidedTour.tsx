"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useTourStore } from "./useTourStore";
import { TOUR_STEPS, type TourStep } from "./tourSteps";
import { useProvaStore } from "@/store/useProvaStore";

/* ── Tooltip position calculator ─────────────────────── */

interface TooltipPos {
  top: number;
  left: number;
  arrowSide: "top" | "bottom" | "left" | "right";
}

const TOOLTIP_GAP = 12;
const TOOLTIP_MAX_W = 320;
const VIEWPORT_PAD = 8;

function calcTooltipPos(
  target: DOMRect,
  placement: TourStep["placement"],
  tooltipH: number,
): TooltipPos {
  let pos: TooltipPos;
  switch (placement) {
    case "bottom-center":
      pos = {
        top: target.bottom + TOOLTIP_GAP,
        left: target.left + target.width / 2 - TOOLTIP_MAX_W / 2,
        arrowSide: "top",
      };
      break;
    case "bottom-left":
      pos = {
        top: target.bottom + TOOLTIP_GAP,
        left: target.left,
        arrowSide: "top",
      };
      break;
    case "bottom-right":
      pos = {
        top: target.bottom + TOOLTIP_GAP,
        left: target.right - TOOLTIP_MAX_W,
        arrowSide: "top",
      };
      break;
    case "right":
      pos = {
        top: target.top + target.height / 2 - tooltipH / 2,
        left: target.right + TOOLTIP_GAP,
        arrowSide: "left",
      };
      break;
    case "left":
      pos = {
        top: target.top + target.height / 2 - tooltipH / 2,
        left: target.left - TOOLTIP_MAX_W - TOOLTIP_GAP,
        arrowSide: "right",
      };
      break;
  }

  // Viewport clamp
  pos.left = Math.max(VIEWPORT_PAD, Math.min(pos.left, window.innerWidth - TOOLTIP_MAX_W - VIEWPORT_PAD));
  pos.top = Math.max(VIEWPORT_PAD, Math.min(pos.top, window.innerHeight - tooltipH - VIEWPORT_PAD));

  return pos;
}

/* ── Spotlight clip-path builder ─────────────────────── */

function buildClipPath(rect: DOMRect, pad = 8): string {
  const t = Math.max(0, rect.top - pad);
  const l = Math.max(0, rect.left - pad);
  const b = rect.bottom + pad;
  const r = rect.right + pad;

  // Outer rect (full screen) → inner cutout (target area)
  return `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px
  )`;
}

/* ── Arrow component ─────────────────────────────────── */

function Arrow({ side }: { side: TooltipPos["arrowSide"] }) {
  const base = "absolute w-0 h-0";
  const styles: Record<string, string> = {
    top: `${base} -top-[6px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#30363d]`,
    bottom: `${base} -bottom-[6px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#30363d]`,
    left: `${base} -left-[6px] top-1/2 -translate-y-1/2 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#30363d]`,
    right: `${base} -right-[6px] top-1/2 -translate-y-1/2 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-[#30363d]`,
  };
  return <div className={styles[side]} />;
}

/* ── Main GuidedTour component ───────────────────────── */

/* ── Completion modal ────────────────────────────────── */

function CompletionModal() {
  const { showCompletionModal, closeCompletionModal } = useTourStore();

  useEffect(() => {
    if (!showCompletionModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") closeCompletionModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showCompletionModal, closeCompletionModal]);

  if (!showCompletionModal) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60"
        onClick={closeCompletionModal}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="투어 완료"
        className="fixed z-[61] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] rounded-lg border border-[#30363d] bg-[#161b22] shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-6 text-center">
          <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-[#238636]/20 flex items-center justify-center">
            <span className="text-lg">✓</span>
          </div>
          <h3 className="text-[15px] font-bold text-white">준비 완료!</h3>
          <p className="mt-2 text-[12px] text-[#8b949e] leading-relaxed whitespace-pre-line">
            {"이제 코드를 작성하고 디버깅을 시작해 보세요.\n투어를 다시 보려면 우측 상단 ⚙ 버튼을 클릭하세요."}
          </p>
          <button
            className="mt-4 h-8 px-5 rounded bg-[#238636] text-[13px] text-white font-medium hover:bg-[#2ea043] transition-colors"
            onClick={closeCompletionModal}
          >
            시작하기
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Main GuidedTour component ───────────────────────── */

export function GuidedTour() {
  const { isTourActive, currentStep, nextStep, prevStep, endTour, startTour, isCompleted } =
    useTourStore();
  const pyodideStatus = useProvaStore((s) => s.pyodideStatus);
  const uiMode = useProvaStore((s) => s.uiMode);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(180);

  // Auto-start on first visit
  useEffect(() => {
    if (pyodideStatus === "ready" && uiMode === "ready" && !isCompleted()) {
      const timer = setTimeout(() => startTour(), 500);
      return () => clearTimeout(timer);
    }
  }, [pyodideStatus, uiMode]);

  // Measure target element on step change / resize
  const measureTarget = useCallback(() => {
    if (!isTourActive) return;
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [isTourActive, currentStep]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    return () => window.removeEventListener("resize", measureTarget);
  }, [measureTarget]);

  // Measure tooltip height for positioning
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight);
    }
  }, [currentStep, isTourActive]);

  // Keyboard handler
  useEffect(() => {
    if (!isTourActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") endTour();
      else if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      else if (e.key === "ArrowLeft") prevStep();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isTourActive, nextStep, prevStep, endTour]);

  // End tour if user starts debugging
  useEffect(() => {
    if (isTourActive && uiMode === "running") {
      endTour();
    }
  }, [uiMode, isTourActive, endTour]);

  if (!isTourActive) return <CompletionModal />;
  if (!targetRect) return null;

  const step = TOUR_STEPS[currentStep];
  const pos = calcTooltipPos(targetRect, step.placement, tooltipHeight);
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[60] transition-[clip-path] duration-300 ease-out"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          clipPath: buildClipPath(targetRect),
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className="fixed z-[61] w-[320px] rounded-lg border border-[#30363d] bg-[#161b22] shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in duration-200"
        style={{ top: pos.top, left: pos.left }}
      >
        <Arrow side={pos.arrowSide} />

        {/* Progress bar */}
        <div className="h-[2px] rounded-t-lg bg-[#30363d] overflow-hidden">
          <div
            className="h-full bg-[#3fb950] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          {/* Step indicator */}
          <span className="text-[10px] text-[#8b949e] font-mono">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>

          {/* Content */}
          <h3 className="mt-2 text-[14px] font-bold text-white">{step.title}</h3>
          <p className="mt-1 text-[12px] text-[#8b949e] leading-relaxed whitespace-pre-line">{step.body}</p>

          {/* Buttons */}
          <div className="mt-4 flex items-center justify-between">
            <button
              className="text-[12px] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
              onClick={endTour}
            >
              건너뛰기
            </button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  className="h-7 px-3 rounded border border-[#30363d] text-[12px] text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                  onClick={prevStep}
                >
                  이전
                </button>
              )}
              <button
                className="h-7 px-3 rounded bg-[#238636] text-[12px] text-white font-medium hover:bg-[#2ea043] transition-colors"
                onClick={nextStep}
              >
                {isLast ? "시작하기!" : "다음"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
