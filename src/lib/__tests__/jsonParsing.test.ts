import { describe, it, expect } from "vitest";
import {
  stripCodeFence,
  extractFirstJsonObject,
  sanitizeJsonCandidate,
  tryParseJson,
} from "../jsonParsing";

/* ── stripCodeFence ── */
describe("stripCodeFence", () => {
  it("stripCodeFence는 ```json 코드펜스를 제거한다", () => {
    expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("stripCodeFence는 json 없는 ```코드펜스를 제거한다", () => {
    expect(stripCodeFence('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("stripCodeFence는 코드펜스 없는 텍스트를 그대로 반환한다", () => {
    expect(stripCodeFence('{"a":1}')).toBe('{"a":1}');
  });

  it("stripCodeFence는 빈 문자열을 빈 문자열로 반환한다", () => {
    expect(stripCodeFence("")).toBe("");
  });
});

/* ── extractFirstJsonObject ── */
describe("extractFirstJsonObject", () => {
  it("extractFirstJsonObject는 정상 JSON 객체를 추출한다", () => {
    expect(extractFirstJsonObject('{"key":"value"}')).toBe('{"key":"value"}');
  });

  it("extractFirstJsonObject는 앞에 텍스트가 붙은 JSON에서 객체를 추출한다", () => {
    expect(extractFirstJsonObject('Here is the result: {"a":1}')).toBe(
      '{"a":1}',
    );
  });

  it("extractFirstJsonObject는 중첩 객체를 최외곽까지 추출한다", () => {
    const input = '{"outer":{"inner":1}}';
    expect(extractFirstJsonObject(input)).toBe(input);
  });

  it("extractFirstJsonObject는 문자열 내 }를 깊이 계산에 포함하지 않는다", () => {
    const input = '{"key":"val}ue"}';
    expect(extractFirstJsonObject(input)).toBe(input);
  });

  it("extractFirstJsonObject는 {가 없는 텍스트를 원본 그대로 반환한다", () => {
    expect(extractFirstJsonObject("no json here")).toBe("no json here");
  });

  it("extractFirstJsonObject는 닫히지 않는 {가 있으면 원본을 반환한다", () => {
    const input = '{"key":"value"';
    expect(extractFirstJsonObject(input)).toBe(input);
  });
});

/* ── sanitizeJsonCandidate ── */
describe("sanitizeJsonCandidate", () => {
  it("sanitizeJsonCandidate는 BOM을 제거한다", () => {
    expect(sanitizeJsonCandidate('\uFEFF{"a":1}')).toBe('{"a":1}');
  });

  it("sanitizeJsonCandidate는 스마트 따옴표를 일반 따옴표로 변환한다", () => {
    expect(sanitizeJsonCandidate('\u201C"key\u201D')).toBe('""key"');
    expect(sanitizeJsonCandidate("\u2018val\u2019")).toBe("'val'");
  });

  it("sanitizeJsonCandidate는 trailing comma를 제거한다", () => {
    expect(sanitizeJsonCandidate('{"a":1,}')).toBe('{"a":1}');
    expect(sanitizeJsonCandidate("[1,2,]")).toBe("[1,2]");
  });

  it("sanitizeJsonCandidate는 제어 문자를 제거한다", () => {
    expect(sanitizeJsonCandidate('{"a":\u00001}')).toBe('{"a":1}');
  });
});

/* ── tryParseJson ── */
describe("tryParseJson", () => {
  it("tryParseJson는 정상 JSON을 파싱한다", () => {
    const result = tryParseJson<{ a: number }>('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it("tryParseJson는 코드펜스 감싸진 JSON을 파싱한다", () => {
    const result = tryParseJson<{ a: number }>('```json\n{"a":1}\n```');
    expect(result).toEqual({ a: 1 });
  });

  it("tryParseJson는 스마트 따옴표 + trailing comma를 보정 후 파싱한다", () => {
    const input = '```json\n{\u201Ckey\u201D: \u201Cvalue\u201D,}\n```';
    const result = tryParseJson<{ key: string }>(input);
    expect(result).toEqual({ key: "value" });
  });

  it("tryParseJson는 완전 깨진 텍스트에서 null을 반환한다", () => {
    expect(tryParseJson("not json at all !!!")).toBeNull();
  });

  it("tryParseJson는 빈 문자열에서 null을 반환한다", () => {
    expect(tryParseJson("")).toBeNull();
  });

  it("tryParseJson는 제네릭 타입으로 결과를 캐스트한다", () => {
    type MyType = { name: string; count: number };
    const result = tryParseJson<MyType>('{"name":"test","count":42}');
    expect(result).not.toBeNull();
    expect(result!.name).toBe("test");
    expect(result!.count).toBe(42);
  });

  it("tryParseJson는 앞뒤 텍스트가 붙은 JSON도 추출하여 파싱한다", () => {
    const result = tryParseJson<{ a: number }>(
      'The answer is: {"a":1} -- done',
    );
    expect(result).toEqual({ a: 1 });
  });
});
