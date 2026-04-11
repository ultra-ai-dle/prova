import { describe, it, expect } from "vitest";
import {
  lineFromOffset,
  stableStringifyObject,
  detectIndentSize,
  convertIndent,
} from "../textUtils";

// ── lineFromOffset ────────────────────────────────────────────────────────────

describe("lineFromOffset", () => {
  const text = "aaa\nbbb\nccc";

  it("첫 줄 내 offset에 대해 1을 반환한다", () => {
    expect(lineFromOffset(text, 2)).toBe(1);
  });

  it("여러 줄 중간 offset에 대해 해당 줄 번호를 반환한다", () => {
    // offset 5 → "aaa\nb" → 2줄
    expect(lineFromOffset(text, 5)).toBe(2);
  });

  it("offset 0에 대해 1을 반환한다", () => {
    expect(lineFromOffset(text, 0)).toBe(1);
  });

  it("음수 offset에 대해 1을 반환한다", () => {
    expect(lineFromOffset(text, -5)).toBe(1);
  });
});

// ── stableStringifyObject ─────────────────────────────────────────────────────

describe("stableStringifyObject", () => {
  it("키 순서가 다른 동일 객체에 대해 동일 문자열을 반환한다", () => {
    const a = stableStringifyObject({ b: "2", a: "1" });
    const b = stableStringifyObject({ a: "1", b: "2" });
    expect(a).toBe(b);
  });

  it("빈 객체에 대해 {}를 반환한다", () => {
    expect(stableStringifyObject({})).toBe("{}");
  });

  it("단일 키 객체를 정상 직렬화한다", () => {
    expect(stableStringifyObject({ key: "val" })).toBe('{"key":"val"}');
  });
});

// ── detectIndentSize ──────────────────────────────────────────────────────────

describe("detectIndentSize", () => {
  it("2칸 들여쓰기를 감지하여 2를 반환한다", () => {
    expect(detectIndentSize("if:\n  foo\n  bar")).toBe(2);
  });

  it("4칸 들여쓰기를 감지하여 4를 반환한다", () => {
    expect(detectIndentSize("if:\n    foo\n    bar")).toBe(4);
  });

  it("공백 들여쓰기가 없으면 null을 반환한다", () => {
    expect(detectIndentSize("no indent\nat all")).toBeNull();
  });

  // TODO: 탭 문자를 무시하는 버그 — /^( +)/가 공백만 매칭하여 탭 들여쓰기를 감지하지 못함
  it("탭만 있고 공백이 없으면 null을 반환한다", () => {
    expect(detectIndentSize("if:\n\tfoo\n\tbar")).toBeNull();
  });

  it("혼합 들여쓰기(2, 4, 6)의 GCD 2를 감지한다", () => {
    expect(detectIndentSize("a\n  b\n    c\n      d")).toBe(2);
  });
});

// ── convertIndent ─────────────────────────────────────────────────────────────

describe("convertIndent", () => {
  it("4칸 들여쓰기를 2칸으로 변환한다", () => {
    const input = "def f():\n    if x:\n        return y";
    const expected = "def f():\n  if x:\n    return y";
    expect(convertIndent(input, 4, 2)).toBe(expected);
  });

  it("2칸 들여쓰기를 4칸으로 변환한다", () => {
    const input = "def f():\n  if x:\n    return y";
    const expected = "def f():\n    if x:\n        return y";
    expect(convertIndent(input, 2, 4)).toBe(expected);
  });

  it("탭이 포함된 들여쓰기를 fromSize 기준으로 변환한다", () => {
    // 탭 1개 = fromSize 4칸 → level 1 → toSize 2 → 2칸
    const input = "def f():\n\treturn y";
    expect(convertIndent(input, 4, 2)).toBe("def f():\n  return y");
  });

  it("들여쓰기 없는 줄은 그대로 반환한다", () => {
    expect(convertIndent("no indent", 4, 2)).toBe("no indent");
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(convertIndent("", 4, 2)).toBe("");
  });
});
