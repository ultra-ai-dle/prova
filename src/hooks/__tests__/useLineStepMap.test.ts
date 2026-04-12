import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLineStepMap } from "../useLineStepMap";
import type { MergedTraceStep } from "@/types/prova";

/** 최소 MergedTraceStep fixture */
function step(index: number, line: number): MergedTraceStep {
  return {
    step: index,
    line,
    vars: {},
    scope: { func: "<global>", depth: 0 },
    parent_frames: [],
    runtimeError: null,
    explanation: "",
    visual_actions: [],
    aiError: null,
  };
}

describe("useLineStepMap", () => {
  it("빈 trace에 대해 빈 Map을 반환한다", () => {
    const { result } = renderHook(() => useLineStepMap([]));
    expect(result.current.size).toBe(0);
  });

  it("각 줄을 실행한 스텝 인덱스 배열로 매핑한다", () => {
    const trace = [step(0, 1), step(1, 2), step(2, 3)];
    const { result } = renderHook(() => useLineStepMap(trace));
    expect(result.current.get(1)).toEqual([0]);
    expect(result.current.get(2)).toEqual([1]);
    expect(result.current.get(3)).toEqual([2]);
  });

  it("같은 줄이 여러 번 실행되면 스텝 인덱스를 순서대로 누적한다", () => {
    // 루프: line 2가 3번 실행
    const trace = [step(0, 1), step(1, 2), step(2, 2), step(3, 2), step(4, 3)];
    const { result } = renderHook(() => useLineStepMap(trace));
    expect(result.current.get(2)).toEqual([1, 2, 3]);
    expect(result.current.get(1)).toEqual([0]);
    expect(result.current.get(3)).toEqual([4]);
  });

  it("실행되지 않은 줄 번호에 대해 undefined를 반환한다", () => {
    const trace = [step(0, 1), step(1, 3)];
    const { result } = renderHook(() => useLineStepMap(trace));
    expect(result.current.get(2)).toBeUndefined();
    expect(result.current.get(99)).toBeUndefined();
  });

  it("trace 참조가 바뀌면 매핑을 재계산한다", () => {
    const trace1 = [step(0, 1)];
    const trace2 = [step(0, 1), step(1, 2)];
    const { result, rerender } = renderHook(
      ({ trace }) => useLineStepMap(trace),
      { initialProps: { trace: trace1 } },
    );
    expect(result.current.size).toBe(1);

    rerender({ trace: trace2 });
    expect(result.current.size).toBe(2);
    expect(result.current.get(2)).toEqual([1]);
  });

  it("모든 스텝이 같은 줄이면 하나의 키에 전부 누적한다", () => {
    const trace = [step(0, 5), step(1, 5), step(2, 5)];
    const { result } = renderHook(() => useLineStepMap(trace));
    expect(result.current.size).toBe(1);
    expect(result.current.get(5)).toEqual([0, 1, 2]);
  });
});
