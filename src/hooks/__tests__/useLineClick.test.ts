import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLineClick } from "../useLineClick";

function makeOpts(overrides: {
  map?: Map<number, number[]>;
  currentStepIndex?: number;
  isDisabled?: boolean;
} = {}) {
  return {
    lineStepMap: overrides.map ?? new Map<number, number[]>(),
    currentStepIndex: overrides.currentStepIndex ?? 0,
    setCurrentStep: vi.fn(),
    setPlaying: vi.fn(),
    isDisabled: overrides.isDisabled ?? false,
  };
}

// ── handleLineClick ──────────────────────────────────────────────────────────

describe("handleLineClick", () => {
  it("1회 실행된 줄 클릭 시 해당 스텝으로 이동한다", () => {
    const opts = makeOpts({ map: new Map([[3, [5]]]) });
    const { result } = renderHook(() => useLineClick(opts));

    act(() => result.current.handleLineClick(3));

    expect(opts.setPlaying).toHaveBeenCalledWith(false);
    expect(opts.setCurrentStep).toHaveBeenCalledWith(5);
  });

  it("여러 번 실행된 줄 클릭 시 현재 스텝 이후 가장 가까운 스텝으로 이동한다", () => {
    const opts = makeOpts({
      map: new Map([[2, [1, 4, 7, 10]]]),
      currentStepIndex: 5,
    });
    const { result } = renderHook(() => useLineClick(opts));

    act(() => result.current.handleLineClick(2));

    expect(opts.setCurrentStep).toHaveBeenCalledWith(7);
  });

  it("마지막 실행 스텝 이후 클릭 시 첫 번째 실행으로 순환한다", () => {
    const opts = makeOpts({
      map: new Map([[2, [1, 4, 7]]]),
      currentStepIndex: 10,
    });
    const { result } = renderHook(() => useLineClick(opts));

    act(() => result.current.handleLineClick(2));

    expect(opts.setCurrentStep).toHaveBeenCalledWith(1);
  });

  it("현재 스텝이 마지막 실행 스텝과 동일하면 첫 번째로 순환한다", () => {
    const opts = makeOpts({
      map: new Map([[2, [1, 4, 7]]]),
      currentStepIndex: 7,
    });
    const { result } = renderHook(() => useLineClick(opts));

    act(() => result.current.handleLineClick(2));

    expect(opts.setCurrentStep).toHaveBeenCalledWith(1);
  });

  it("미실행 줄 클릭 시 아무 동작도 하지 않는다", () => {
    const opts = makeOpts({ map: new Map([[1, [0]]]) });
    const { result } = renderHook(() => useLineClick(opts));

    act(() => result.current.handleLineClick(99));

    expect(opts.setCurrentStep).not.toHaveBeenCalled();
    expect(opts.setPlaying).not.toHaveBeenCalled();
  });

  it("isDisabled일 때 클릭을 무시한다", () => {
    const opts = makeOpts({
      map: new Map([[1, [0]]]),
      isDisabled: true,
    });
    const { result } = renderHook(() => useLineClick(opts));

    act(() => result.current.handleLineClick(1));

    expect(opts.setCurrentStep).not.toHaveBeenCalled();
    expect(opts.setPlaying).not.toHaveBeenCalled();
  });

  it("클릭 시 항상 setPlaying(false)를 호출한다", () => {
    const opts = makeOpts({ map: new Map([[1, [3]]]) });
    const { result } = renderHook(() => useLineClick(opts));

    act(() => result.current.handleLineClick(1));

    expect(opts.setPlaying).toHaveBeenCalledWith(false);
  });
});

// ── getLineHitInfo ───────────────────────────────────────────────────────────

describe("getLineHitInfo", () => {
  it("미실행 줄에 대해 totalHits 0, currentHitIndex null을 반환한다", () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useLineClick(opts));

    expect(result.current.getLineHitInfo(99)).toEqual({
      totalHits: 0,
      currentHitIndex: null,
    });
  });

  it("1회 실행 줄의 totalHits를 1로 반환한다", () => {
    const opts = makeOpts({
      map: new Map([[3, [5]]]),
      currentStepIndex: 5,
    });
    const { result } = renderHook(() => useLineClick(opts));

    expect(result.current.getLineHitInfo(3)).toEqual({
      totalHits: 1,
      currentHitIndex: 1,
    });
  });

  it("현재 스텝이 해당 줄의 실행이 아닌 경우 currentHitIndex가 null이다", () => {
    const opts = makeOpts({
      map: new Map([[3, [5]]]),
      currentStepIndex: 2,
    });
    const { result } = renderHook(() => useLineClick(opts));

    expect(result.current.getLineHitInfo(3)).toEqual({
      totalHits: 1,
      currentHitIndex: null,
    });
  });

  it("여러 번 실행된 줄에서 현재 스텝의 1-based 인덱스를 반환한다", () => {
    const opts = makeOpts({
      map: new Map([[2, [1, 4, 7, 10]]]),
      currentStepIndex: 7,
    });
    const { result } = renderHook(() => useLineClick(opts));

    expect(result.current.getLineHitInfo(2)).toEqual({
      totalHits: 4,
      currentHitIndex: 3,
    });
  });

  it("빈 Map에 대해 모든 줄이 totalHits 0이다", () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useLineClick(opts));

    expect(result.current.getLineHitInfo(1).totalHits).toBe(0);
    expect(result.current.getLineHitInfo(100).totalHits).toBe(0);
  });
});
