import { useCallback, useMemo } from "react";

export interface LineHitInfo {
  totalHits: number;
  /** 현재 스텝이 이 줄의 몇 번째 실행인지 (1-based). 아니면 null */
  currentHitIndex: number | null;
}

interface UseLineClickOpts {
  lineStepMap: Map<number, number[]>;
  currentStepIndex: number;
  setCurrentStep: (step: number) => void;
  setPlaying: (playing: boolean) => void;
  isDisabled: boolean;
}

export function useLineClick({
  lineStepMap,
  currentStepIndex,
  setCurrentStep,
  setPlaying,
  isDisabled,
}: UseLineClickOpts) {
  const handleLineClick = useCallback(
    (lineNo: number) => {
      if (isDisabled) return;

      const steps = lineStepMap.get(lineNo);
      if (!steps || steps.length === 0) return;

      // 재생 중이면 일시정지
      setPlaying(false);

      if (steps.length === 1) {
        setCurrentStep(steps[0]);
        return;
      }

      // 현재 스텝 이후의 가장 가까운 실행 스텝 찾기
      const nextIdx = steps.find((s) => s > currentStepIndex);
      setCurrentStep(nextIdx !== undefined ? nextIdx : steps[0]);
    },
    [lineStepMap, currentStepIndex, setCurrentStep, setPlaying, isDisabled]
  );

  const getLineHitInfo = useCallback(
    (lineNo: number): LineHitInfo => {
      const steps = lineStepMap.get(lineNo);
      if (!steps || steps.length === 0) {
        return { totalHits: 0, currentHitIndex: null };
      }

      const hitIdx = steps.indexOf(currentStepIndex);
      return {
        totalHits: steps.length,
        currentHitIndex: hitIdx >= 0 ? hitIdx + 1 : null,
      };
    },
    [lineStepMap, currentStepIndex]
  );

  return { handleLineClick, getLineHitInfo } as const;
}
