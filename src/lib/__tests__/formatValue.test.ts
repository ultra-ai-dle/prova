import { describe, it, expect } from "vitest";
import {
  toFiniteNumber,
  toNumberWithFallback,
  isPlainObject,
  formatScalar,
  formatCellValue,
  formatCompact,
  toJsonLike,
  toJsonCompact,
  toJsonPreferSingleLine,
  maxNumericAbs,
  formatWithBitMode,
} from "../formatValue";

// ── toFiniteNumber ────────────────────────────────────────────────────────────

describe("toFiniteNumber", () => {
  it("유한 숫자를 그대로 반환한다", () => {
    expect(toFiniteNumber(42)).toBe(42);
    expect(toFiniteNumber(-3.14)).toBe(-3.14);
    expect(toFiniteNumber(0)).toBe(0);
  });

  it("숫자 문자열을 파싱하여 반환한다", () => {
    expect(toFiniteNumber("42")).toBe(42);
    expect(toFiniteNumber("  -7.5  ")).toBe(-7.5);
  });

  it("빈 문자열이나 공백만 있으면 null을 반환한다", () => {
    expect(toFiniteNumber("")).toBeNull();
    expect(toFiniteNumber("   ")).toBeNull();
  });

  it("NaN, Infinity는 null을 반환한다", () => {
    expect(toFiniteNumber(NaN)).toBeNull();
    expect(toFiniteNumber(Infinity)).toBeNull();
    expect(toFiniteNumber(-Infinity)).toBeNull();
    expect(toFiniteNumber("NaN")).toBeNull();
    expect(toFiniteNumber("Infinity")).toBeNull();
  });

  it("boolean, null, undefined는 null을 반환한다", () => {
    expect(toFiniteNumber(true)).toBeNull();
    expect(toFiniteNumber(false)).toBeNull();
    expect(toFiniteNumber(null)).toBeNull();
    expect(toFiniteNumber(undefined)).toBeNull();
  });
});

// ── toNumberWithFallback ──────────────────────────────────────────────────────

describe("toNumberWithFallback", () => {
  it("유한 숫자를 그대로 반환한다", () => {
    expect(toNumberWithFallback(42)).toBe(42);
    expect(toNumberWithFallback(0)).toBe(0);
  });

  it("boolean을 0 또는 1로 변환한다", () => {
    expect(toNumberWithFallback(true)).toBe(1);
    expect(toNumberWithFallback(false)).toBe(0);
  });

  it("숫자 문자열을 파싱하여 반환한다", () => {
    expect(toNumberWithFallback("42")).toBe(42);
    expect(toNumberWithFallback("  -3.5  ")).toBe(-3.5);
  });

  it("파싱 불가 문자열은 0을 반환한다", () => {
    expect(toNumberWithFallback("abc")).toBe(0);
    expect(toNumberWithFallback("NaN")).toBe(0);
  });

  it("빈 문자열은 0을 반환한다", () => {
    expect(toNumberWithFallback("")).toBe(0);
    expect(toNumberWithFallback("   ")).toBe(0);
  });

  it("null, undefined는 0을 반환한다", () => {
    expect(toNumberWithFallback(null)).toBe(0);
    expect(toNumberWithFallback(undefined)).toBe(0);
  });
});

// ── isPlainObject ─────────────────────────────────────────────────────────────

describe("isPlainObject", () => {
  it("일반 객체에 대해 true를 반환한다", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("배열에 대해 false를 반환한다", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it("null에 대해 false를 반환한다", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it("원시값에 대해 false를 반환한다", () => {
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject("str")).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});

// ── formatScalar ──────────────────────────────────────────────────────────────

describe("formatScalar", () => {
  it('null과 undefined에 대해 "null"을 반환한다', () => {
    expect(formatScalar(null)).toBe("null");
    expect(formatScalar(undefined)).toBe("null");
  });

  it('"True"/"true"는 "T", "False"/"false"는 "F"로 반환한다', () => {
    expect(formatScalar("True")).toBe("T");
    expect(formatScalar("true")).toBe("T");
    expect(formatScalar("False")).toBe("F");
    expect(formatScalar("false")).toBe("F");
  });

  it("26자 이하 문자열은 그대로 반환한다", () => {
    expect(formatScalar("hello")).toBe("hello");
  });

  it("26자 초과 문자열은 절삭 후 …을 붙인다", () => {
    const long = "a".repeat(30);
    expect(formatScalar(long)).toBe("a".repeat(26) + "…");
  });

  it("숫자를 문자열로 변환한다", () => {
    expect(formatScalar(42)).toBe("42");
    expect(formatScalar(-3.14)).toBe("-3.14");
  });

  it("bitmaskMode에서 양의 정수를 이진수 패딩으로 반환한다", () => {
    expect(formatScalar(5, true, 4)).toBe("0101");
    expect(formatScalar(0, true, 3)).toBe("000");
  });

  it("boolean true는 T, false는 F를 반환한다", () => {
    expect(formatScalar(true)).toBe("T");
    expect(formatScalar(false)).toBe("F");
  });

  it("기타 값은 String()으로 변환한다", () => {
    expect(formatScalar(Symbol.for("x"))).toBe("Symbol(x)");
  });
});

// ── formatCellValue ───────────────────────────────────────────────────────────

describe("formatCellValue", () => {
  it("null과 undefined에 대해 빈 문자열을 반환한다", () => {
    expect(formatCellValue(null)).toBe("");
    expect(formatCellValue(undefined)).toBe("");
  });

  it("숫자를 문자열로 변환한다", () => {
    expect(formatCellValue(42)).toBe("42");
  });

  it("bitmaskMode에서 양의 정수를 이진수로 반환한다", () => {
    expect(formatCellValue(5, true, 4)).toBe("0101");
  });

  it("boolean true는 T, false는 F를 반환한다", () => {
    expect(formatCellValue(true)).toBe("T");
    expect(formatCellValue(false)).toBe("F");
  });

  it("8자 이하 문자열은 그대로, 초과 시 절삭한다", () => {
    expect(formatCellValue("short")).toBe("short");
    expect(formatCellValue("123456789")).toBe("12345678…");
  });

  it('배열은 [length] 형식으로 반환한다', () => {
    expect(formatCellValue([1, 2, 3])).toBe("[3]");
  });

  it('객체는 "{...}"를 반환한다', () => {
    expect(formatCellValue({ a: 1 })).toBe("{...}");
  });
});

// ── formatCompact ─────────────────────────────────────────────────────────────

describe("formatCompact", () => {
  it("배열은 [length] 형식으로 반환한다", () => {
    expect(formatCompact([1, 2, 3])).toBe("[3]");
  });

  it("객체는 {keyCount} 형식으로 반환한다", () => {
    expect(formatCompact({ a: 1, b: 2 })).toBe("{2}");
  });

  it("스칼라 값은 formatScalar에 위임한다", () => {
    expect(formatCompact(42)).toBe("42");
    expect(formatCompact("True")).toBe("T");
    expect(formatCompact(null)).toBe("null");
  });
});

// ── toJsonLike ────────────────────────────────────────────────────────────────

describe("toJsonLike", () => {
  it("스칼라 값을 올바르게 직렬화한다", () => {
    expect(toJsonLike(null)).toBe("null");
    expect(toJsonLike(42)).toBe("42");
    expect(toJsonLike(true)).toBe("T");
    expect(toJsonLike("hello")).toBe('"hello"');
  });

  it("빈 배열은 []를 반환한다", () => {
    expect(toJsonLike([])).toBe("[]");
  });

  it("배열을 인덴트 포맷으로 반환한다", () => {
    const result = toJsonLike([1, 2]);
    expect(result).toContain("  1");
    expect(result).toContain("  2");
    expect(result).toMatch(/^\[[\s\S]+\]$/);
  });

  it("16개 초과 배열은 tail 표시를 포함한다", () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    const result = toJsonLike(arr);
    expect(result).toContain("...(+4)");
  });

  it("빈 객체는 {}를 반환한다", () => {
    expect(toJsonLike({})).toBe("{}");
  });

  it("bitmaskMode에서 양의 정수를 이진수로 직렬화한다", () => {
    expect(toJsonLike(5, 0, true, 4)).toBe("0101");
  });
});

// ── toJsonCompact ─────────────────────────────────────────────────────────────

describe("toJsonCompact", () => {
  it("스칼라 값을 올바르게 직렬화한다", () => {
    expect(toJsonCompact(null)).toBe("null");
    expect(toJsonCompact(42)).toBe("42");
    expect(toJsonCompact(true)).toBe("T");
    expect(toJsonCompact("hi")).toBe('"hi"');
  });

  it("배열을 한 줄 콤마 구분으로 반환한다", () => {
    expect(toJsonCompact([1, 2, 3])).toBe("[1, 2, 3]");
  });

  it("객체를 키 정렬 한 줄로 반환한다", () => {
    expect(toJsonCompact({ b: 2, a: 1 })).toBe('{ "a": 1, "b": 2 }');
  });

  it("bitmaskMode에서 양의 정수를 이진수로 직렬화한다", () => {
    expect(toJsonCompact(3, true, 4)).toBe("0011");
  });
});

// ── toJsonPreferSingleLine ────────────────────────────────────────────────────

describe("toJsonPreferSingleLine", () => {
  it("짧은 값은 한 줄로 반환한다", () => {
    expect(toJsonPreferSingleLine([1, 2])).toBe("[1, 2]");
  });

  it("maxLen 초과 시 여러 줄로 반환한다", () => {
    const result = toJsonPreferSingleLine([1, 2, 3], 5);
    expect(result).toContain("\n");
  });
});

// ── maxNumericAbs ─────────────────────────────────────────────────────────────

describe("maxNumericAbs", () => {
  it("단일 숫자의 절댓값을 반환한다", () => {
    expect(maxNumericAbs(-7)).toBe(7);
    expect(maxNumericAbs(3)).toBe(3);
  });

  it("중첩 배열에서 최대 절댓값을 반환한다", () => {
    expect(maxNumericAbs([[1, -5], [3, 2]])).toBe(5);
  });

  it("중첩 객체에서 최대 절댓값을 반환한다", () => {
    expect(maxNumericAbs({ a: -10, b: { c: 3 } })).toBe(10);
  });

  it("비숫자 값은 0을 반환한다", () => {
    expect(maxNumericAbs("hello")).toBe(0);
    expect(maxNumericAbs(null)).toBe(0);
  });
});

// ── formatWithBitMode ─────────────────────────────────────────────────────────

describe("formatWithBitMode", () => {
  it("bitmaskMode가 false이면 JSON.stringify를 반환한다", () => {
    expect(formatWithBitMode(42, false, 1)).toBe("42");
    expect(formatWithBitMode("hello", false, 1)).toBe('"hello"');
  });

  it("bitmaskMode가 true이고 양의 정수이면 값과 이진수를 반환한다", () => {
    expect(formatWithBitMode(5, true, 4)).toBe("5 (0101)");
    expect(formatWithBitMode(0, true, 3)).toBe("0 (000)");
  });

  it("bitmaskMode가 true여도 음수나 소수이면 JSON.stringify를 반환한다", () => {
    expect(formatWithBitMode(-1, true, 4)).toBe("-1");
    expect(formatWithBitMode(3.14, true, 4)).toBe("3.14");
  });
});
