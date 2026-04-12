import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGallery } from "../useGallery";
import type { ExampleItem, ExampleVariant } from "@/data/examples";

// ── Fixtures ────────────────────────────────────────────────────────────────

const VARIANT_PY: ExampleVariant = {
  language: "python",
  code: 'print("hello")',
  stdin: "",
};

const VARIANT_JS: ExampleVariant = {
  language: "javascript",
  code: 'console.log("hello")',
  stdin: "",
};

const EXAMPLE: ExampleItem = {
  id: "test-example",
  title: "Test Example",
  titleKo: "테스트 예제",
  category: "sorting",
  tags: ["sorting"],
  difficulty: "easy",
  variants: [VARIANT_PY, VARIANT_JS],
  featured: true,
};

// ── 초기 상태 ───────────────────────────────────────────────────────────────

describe("useGallery 초기 상태", () => {
  it("초기 상태는 모달 닫힘, 카테고리 sorting, confirm null이다", () => {
    const { result } = renderHook(() => useGallery());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedCategory).toBe("sorting");
    expect(result.current.confirmTarget).toBeNull();
    expect(result.current.confirmVariant).toBeNull();
  });
});

// ── open / close ────────────────────────────────────────────────────────────

describe("open / close", () => {
  it("open은 isOpen을 true로 설정한다", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
  });

  it("close는 isOpen을 false로 설정하고 confirm 상태를 초기화한다", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.open());
    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_PY));
    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.confirmTarget).toBeNull();
    expect(result.current.confirmVariant).toBeNull();
  });

  it("open은 이전 confirm 상태를 초기화한다", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.open());
    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_PY));
    act(() => result.current.close());
    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.confirmTarget).toBeNull();
    expect(result.current.confirmVariant).toBeNull();
  });
});

// ── selectCategory ──────────────────────────────────────────────────────────

describe("selectCategory", () => {
  it("카테고리를 변경한다", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.selectCategory("graph"));

    expect(result.current.selectedCategory).toBe("graph");
  });

  it("카테고리 변경 시 confirm 상태를 초기화한다", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.open());
    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_PY));
    act(() => result.current.selectCategory("dp"));

    expect(result.current.selectedCategory).toBe("dp");
    expect(result.current.confirmTarget).toBeNull();
    expect(result.current.confirmVariant).toBeNull();
  });
});

// ── requestConfirm / cancelConfirm ──────────────────────────────────────────

describe("requestConfirm / cancelConfirm", () => {
  it("requestConfirm은 confirmTarget과 confirmVariant를 설정한다", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_JS));

    expect(result.current.confirmTarget).toBe(EXAMPLE);
    expect(result.current.confirmVariant).toBe(VARIANT_JS);
  });

  it("cancelConfirm은 confirmTarget과 confirmVariant를 null로 설정한다", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_PY));
    act(() => result.current.cancelConfirm());

    expect(result.current.confirmTarget).toBeNull();
    expect(result.current.confirmVariant).toBeNull();
  });

  it("requestConfirm은 이전 confirm을 덮어쓴다", () => {
    const { result } = renderHook(() => useGallery());
    const OTHER: ExampleItem = { ...EXAMPLE, id: "other" };

    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_PY));
    act(() => result.current.requestConfirm(OTHER, VARIANT_JS));

    expect(result.current.confirmTarget).toBe(OTHER);
    expect(result.current.confirmVariant).toBe(VARIANT_JS);
  });
});

// ── 복합 시나리오 ───────────────────────────────────────────────────────────

describe("복합 시나리오", () => {
  it("open → confirm → cancel → 카드그리드 복귀 흐름", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_PY));
    expect(result.current.confirmTarget).toBe(EXAMPLE);

    act(() => result.current.cancelConfirm());
    expect(result.current.confirmTarget).toBeNull();
    expect(result.current.isOpen).toBe(true);
  });

  it("open → 카테고리 순회 → 선택 → close 전체 흐름", () => {
    const { result } = renderHook(() => useGallery());

    act(() => result.current.open());
    act(() => result.current.selectCategory("recursion"));
    act(() => result.current.selectCategory("dp"));
    act(() => result.current.requestConfirm(EXAMPLE, VARIANT_JS));
    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedCategory).toBe("dp");
    expect(result.current.confirmTarget).toBeNull();
  });
});
