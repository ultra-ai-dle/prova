import { useMemo } from "react";
import type { MergedTraceStep } from "@/types/prova";

/**
 * mergedTrace에서 line → stepIndex[] 매핑을 생성한다.
 * 각 줄이 실행된 모든 스텝 인덱스를 순서대로 배열로 반환.
 */
export function useLineStepMap(
  mergedTrace: MergedTraceStep[]
): Map<number, number[]> {
  return useMemo(() => {
    const map = new Map<number, number[]>();
    for (let i = 0; i < mergedTrace.length; i++) {
      const line = mergedTrace[i].line;
      const arr = map.get(line);
      if (arr) {
        arr.push(i);
      } else {
        map.set(line, [i]);
      }
    }
    return map;
  }, [mergedTrace]);
}
