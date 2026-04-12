import { useEffect } from "react";

export function useKeyboardNavigation({
  currentStep,
  isPlaying,
  traceLength,
  setCurrentStep,
  setPlaying,
}: {
  currentStep: number;
  isPlaying: boolean;
  traceLength: number;
  setCurrentStep: (step: number) => void;
  setPlaying: (playing: boolean) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isThreeNavContext = !!activeEl?.closest?.(
        "[data-prova-3d-nav='true']",
      );
      if (isThreeNavContext) return;

      const target = e.target as HTMLElement | null;
      const isTypingContext =
        !!target &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable);
      if (isTypingContext) return;

      if (e.key === "ArrowLeft") setCurrentStep(currentStep - 1);
      if (e.key === "ArrowRight") setCurrentStep(currentStep + 1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying(!isPlaying);
      }
      if (e.key === "Home") setCurrentStep(0);
      if (e.key === "End") setCurrentStep(traceLength - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    traceLength,
    currentStep,
    isPlaying,
    setCurrentStep,
    setPlaying,
  ]);
}
