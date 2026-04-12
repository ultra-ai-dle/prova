import { useEffect, useRef } from "react";
import type { MergedTraceStep } from "@/types/prova";

export function usePlaybackTimer({
  currentStep,
  isPlaying,
  playbackSpeed,
  mergedTrace,
  setCurrentStep,
  setPlaying,
  setUiMode,
}: {
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
  mergedTrace: MergedTraceStep[];
  setCurrentStep: (step: number) => void;
  setPlaying: (playing: boolean) => void;
  setUiMode: (mode: "errorStep") => void;
}) {
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (playTimer.current) clearInterval(playTimer.current);
      playTimer.current = null;
      return;
    }
    if (playTimer.current) clearInterval(playTimer.current);
    playTimer.current = setInterval(
      () => {
        const next = currentStep + 1;
        if (next >= mergedTrace.length) {
          setPlaying(false);
          return;
        }
        if (mergedTrace[next]?.runtimeError) {
          setCurrentStep(next);
          setPlaying(false);
          setUiMode("errorStep");
          return;
        }
        setCurrentStep(next);
      },
      Math.max(300, 900 / playbackSpeed),
    );
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [
    mergedTrace,
    currentStep,
    isPlaying,
    playbackSpeed,
    setCurrentStep,
    setPlaying,
    setUiMode,
  ]);
}
