import { describe, it, expect } from "vitest";
import {
  is2DArray,
  is1DArray,
  to2D,
  getPositiveMaxInGrid,
  getGridCellTone,
  looksLike2DScalarTableGrid,
  is2DRectangularCellGrid,
  detectGraphLike,
  isClearlyGridLike,
  canGraphLikeUseGridView,
  isDirectionVectorTuple,
  isDirectionVectorListLike,
  isDirectionMapLike,
  is3DBooleanStateGrid,
  is2DBitmaskGrid,
  inferBitWidthFromGrid,
  expand2DBitmaskGridTo3D,
} from "../dataDetection";

// ── is2DArray ─────────────────────────────────────────────────────────────────

describe("is2DArray", () => {
  it("2D 배열에 대해 true를 반환한다", () => {
    expect(is2DArray([[1, 2], [3, 4]])).toBe(true);
  });

  it("1D 배열에 대해 false를 반환한다", () => {
    expect(is2DArray([1, 2, 3])).toBe(false);
  });

  it("비배열에 대해 false를 반환한다", () => {
    expect(is2DArray("hello")).toBe(false);
    expect(is2DArray(null)).toBe(false);
  });
});

// ── is1DArray ─────────────────────────────────────────────────────────────────

describe("is1DArray", () => {
  it("1D 배열에 대해 true를 반환한다", () => {
    expect(is1DArray([1, 2, 3])).toBe(true);
  });

  it("2D 배열에 대해 false를 반환한다", () => {
    expect(is1DArray([[1], [2]])).toBe(false);
  });

  it("빈 배열에 대해 true를 반환한다", () => {
    expect(is1DArray([])).toBe(true);
  });
});

// ── to2D ──────────────────────────────────────────────────────────────────────

describe("to2D", () => {
  it("이미 2D 배열이면 그대로 반환한다", () => {
    expect(to2D([[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]]);
  });

  it("1D 원소를 [원소]로 래핑한다", () => {
    expect(to2D([1, 2, 3])).toEqual([[1], [2], [3]]);
  });

  it("비배열이면 빈 배열을 반환한다", () => {
    expect(to2D(null)).toEqual([]);
    expect(to2D("hello")).toEqual([]);
  });
});

// ── getPositiveMaxInGrid ──────────────────────────────────────────────────────

describe("getPositiveMaxInGrid", () => {
  it("양수 격자에서 최대값을 반환한다", () => {
    expect(getPositiveMaxInGrid([[1, 5], [3, 2]])).toBe(5);
  });

  it("양수가 없으면 기본값 1을 반환한다", () => {
    expect(getPositiveMaxInGrid([[0, -1], [-2, 0]])).toBe(1);
  });

  it("혼합 값에서 양수 최대값만 반환한다", () => {
    expect(getPositiveMaxInGrid([[null, "abc", 3], [-1, 0, 7]] as unknown[][])).toBe(7);
  });
});

// ── getGridCellTone ───────────────────────────────────────────────────────────

describe("getGridCellTone", () => {
  it("음수에 대해 빨간 톤을 반환한다", () => {
    expect(getGridCellTone(-5, 10)).toContain("bg-[#3a1919]");
  });

  it("falsy 값(0, null, false)에 대해 어두운 톤을 반환한다", () => {
    const dark = "bg-[#161b22]";
    expect(getGridCellTone(0, 10)).toContain(dark);
    expect(getGridCellTone(null, 10)).toContain(dark);
    expect(getGridCellTone(false, 10)).toContain(dark);
    expect(getGridCellTone("", 10)).toContain(dark);
  });

  it("양수에 대해 파란 톤을 반환한다", () => {
    const tone = getGridCellTone(5, 10);
    expect(tone).toContain("border-[#3c6799]");
  });

  it("positiveMax가 0이어도 에러 없이 동작한다", () => {
    expect(getGridCellTone(1, 0)).toBeDefined();
  });
});

// ── looksLike2DScalarTableGrid ────────────────────────────────────────────────

describe("looksLike2DScalarTableGrid", () => {
  it("정수 DP 테이블에 대해 true를 반환한다", () => {
    expect(looksLike2DScalarTableGrid([[0, 1, 2], [3, 4, 5]])).toBe(true);
  });

  it("빈 행이 포함되면 false를 반환한다", () => {
    expect(looksLike2DScalarTableGrid([[1, 2], []])).toBe(false);
  });

  it("행 길이 차이가 4 초과이면 false를 반환한다", () => {
    expect(looksLike2DScalarTableGrid([[1, 2, 3, 4, 5, 6], [1]])).toBe(false);
  });

  it("스칼라 비율이 82% 미만이면 false를 반환한다", () => {
    // 5개 중 3개만 스칼라 = 60%
    expect(looksLike2DScalarTableGrid([[1, [1], [2], [3], 2]])).toBe(false);
  });

  it("비배열에 대해 false를 반환한다", () => {
    expect(looksLike2DScalarTableGrid("hello")).toBe(false);
    expect(looksLike2DScalarTableGrid(null)).toBe(false);
  });
});

// ── is2DRectangularCellGrid ──────────────────────────────────────────────────

describe("is2DRectangularCellGrid", () => {
  it("균일 스칼라 격자에 대해 true를 반환한다", () => {
    expect(is2DRectangularCellGrid([[1, 2, 3], [4, 5, 6]])).toBe(true);
  });

  it("빈 행이 포함되면 false를 반환한다", () => {
    expect(is2DRectangularCellGrid([[1, 2], []])).toBe(false);
  });

  it("행 길이 차이가 8 초과이면 false를 반환한다", () => {
    const longRow = Array.from({ length: 10 }, (_, i) => i);
    expect(is2DRectangularCellGrid([longRow, [1]])).toBe(false);
  });

  it("스칼라 비율이 68% 미만이면 false를 반환한다", () => {
    // 5개 중 1개만 스칼라 = 20%
    expect(is2DRectangularCellGrid([[1, [1], [2], [3], [4]]])).toBe(false);
  });
});

// ── detectGraphLike ───────────────────────────────────────────────────────────

describe("detectGraphLike", () => {
  it("인접 리스트(빈 행 포함)에 대해 true를 반환한다", () => {
    expect(detectGraphLike([[1, 2], [0], [], [1, 2]])).toBe(true);
  });

  it("2D 스칼라 테이블에 대해 false를 반환한다", () => {
    expect(detectGraphLike([[0, 1, 2], [3, 4, 5], [6, 7, 8]])).toBe(false);
  });

  it("{edges: [...]} 객체에 대해 true를 반환한다", () => {
    expect(detectGraphLike({ edges: [[0, 1], [1, 2]] })).toBe(true);
  });

  it("adjacency map 객체에 대해 true를 반환한다", () => {
    expect(detectGraphLike({ "0": [1, 2], "1": [0] })).toBe(true);
  });

  it("null과 undefined에 대해 false를 반환한다", () => {
    expect(detectGraphLike(null)).toBe(false);
    expect(detectGraphLike(undefined)).toBe(false);
  });
});

// ── isClearlyGridLike ─────────────────────────────────────────────────────────

describe("isClearlyGridLike", () => {
  it("균일 스칼라 격자에 대해 true를 반환한다", () => {
    expect(isClearlyGridLike([[1, 2, 3], [4, 5, 6]])).toBe(true);
  });

  it("빈 행이 포함되면 false를 반환한다", () => {
    expect(isClearlyGridLike([[1, 2], []])).toBe(false);
  });

  it("스칼라 비율이 88% 이하이면 false를 반환한다", () => {
    // 6개 중 5개 스칼라 = 83%
    expect(isClearlyGridLike([[1, 2, [3]], [4, 5, [6]]])).toBe(false);
  });
});

// ── canGraphLikeUseGridView ───────────────────────────────────────────────────

describe("canGraphLikeUseGridView", () => {
  it("모든 행이 배열이면 true를 반환한다", () => {
    expect(canGraphLikeUseGridView([[1], [2]])).toBe(true);
  });

  it("비배열 원소가 포함되면 false를 반환한다", () => {
    expect(canGraphLikeUseGridView([[1], 2])).toBe(false);
  });

  it("빈 배열에 대해 false를 반환한다", () => {
    expect(canGraphLikeUseGridView([])).toBe(false);
  });
});

// ── isDirectionVectorTuple ────────────────────────────────────────────────────

describe("isDirectionVectorTuple", () => {
  it("[1, -1]에 대해 true를 반환한다", () => {
    expect(isDirectionVectorTuple([1, -1])).toBe(true);
  });

  it("길이 3 배열에 대해 false를 반환한다", () => {
    expect(isDirectionVectorTuple([1, 2, 3])).toBe(false);
  });

  it("문자열 원소가 포함되면 false를 반환한다", () => {
    expect(isDirectionVectorTuple(["a", 1])).toBe(false);
  });
});

// ── isDirectionVectorListLike ─────────────────────────────────────────────────

describe("isDirectionVectorListLike", () => {
  it("방향 벡터 리스트에 대해 true를 반환한다", () => {
    expect(isDirectionVectorListLike([[0, 1], [1, 0], [-1, 0], [0, -1]])).toBe(true);
  });

  it("17개 초과이면 false를 반환한다", () => {
    const list = Array.from({ length: 17 }, () => [0, 1]);
    expect(isDirectionVectorListLike(list)).toBe(false);
  });

  it("빈 배열에 대해 false를 반환한다", () => {
    expect(isDirectionVectorListLike([])).toBe(false);
  });
});

// ── isDirectionMapLike ────────────────────────────────────────────────────────

describe("isDirectionMapLike", () => {
  it("방향 ���름 + tuple 값 객체에 대해 true를 반환한다", () => {
    expect(isDirectionMapLike("directions", { U: [0, 1], D: [0, -1] })).toBe(true);
  });

  it("이름이 방향 패턴과 불일치하면 false를 반환한다", () => {
    expect(isDirectionMapLike("config", { U: [0, 1] })).toBe(false);
  });

  it("값이 tuple이 아니면 false를 반환한다", () => {
    expect(isDirectionMapLike("dirs", { U: [0, 1, 2] })).toBe(false);
  });

  it("비객체에 대해 false를 반환한다", () => {
    expect(isDirectionMapLike("dirs", [1, 2])).toBe(false);
  });
});

// ── is3DBooleanStateGrid ──────────────────────────────────────────────────────

describe("is3DBooleanStateGrid", () => {
  it("boolean 3D 격자에 대해 true를 반환한다", () => {
    expect(is3DBooleanStateGrid([[[true, false], [false, true]]])).toBe(true);
  });

  it("숫자 3D 격자에 대해 true를 반환한다", () => {
    expect(is3DBooleanStateGrid([[[0, 1], [1, 0]]])).toBe(true);
  });

  it("빈 내부 배열이면 false를 반환한다", () => {
    expect(is3DBooleanStateGrid([[[]], [[]]])).toBe(false);
  });

  it("비배열에 대해 false를 반환한다", () => {
    expect(is3DBooleanStateGrid("hello")).toBe(false);
    expect(is3DBooleanStateGrid(null)).toBe(false);
  });
});

// ── is2DBitmaskGrid ───────────────────────────────────────────────────────────

describe("is2DBitmaskGrid", () => {
  it("양의 정수 2D 배열에 대해 true를 반환한다", () => {
    expect(is2DBitmaskGrid([[0, 1, 2], [3, 4, 5]])).toBe(true);
  });

  it("음수가 포함되면 false를 반환한다", () => {
    expect(is2DBitmaskGrid([[1, -1]])).toBe(false);
  });

  it("소수가 포함되면 false를 반환한다", () => {
    expect(is2DBitmaskGrid([[1.5, 2]])).toBe(false);
  });

  it("빈 row가 포함되면 false를 반환한다", () => {
    expect(is2DBitmaskGrid([[1, 2], []])).toBe(false);
  });
});

// ── inferBitWidthFromGrid ─────────────────────────────────────────────────────

describe("inferBitWidthFromGrid", () => {
  it("최대값 7에 대해 비트폭 3을 반환한다", () => {
    expect(inferBitWidthFromGrid([[7]])).toBe(3);
  });

  it("최대값 0이면 fallback을 반환한다", () => {
    expect(inferBitWidthFromGrid([[0]])).toBe(1);
    expect(inferBitWidthFromGrid([[0]], 4)).toBe(4);
  });

  it("cap을 초과하지 않는다", () => {
    expect(inferBitWidthFromGrid([[1 << 30]], 1, 16)).toBe(16);
  });
});

// ── expand2DBitmaskGridTo3D ───────────────────────────────────────────────────

describe("expand2DBitmaskGridTo3D", () => {
  it("비트마스크 5를 3비트로 확장한다", () => {
    // 5 = 0b101 → [true, false, true]
    expect(expand2DBitmaskGridTo3D([[5]], 3)).toEqual([[[true, false, true]]]);
  });

  it("비트마스크 0을 2비트로 확장한다", () => {
    expect(expand2DBitmaskGridTo3D([[0]], 2)).toEqual([[[false, false]]]);
  });
});
