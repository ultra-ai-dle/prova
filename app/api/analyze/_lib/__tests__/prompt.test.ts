import { describe, it, expect } from "vitest";
import {
  ANALYZE_CODE_CHAR_LIMIT,
  ANALYZE_VAR_TYPES_LIMIT,
  ANALYZE_GEMINI_SCHEMA,
  compactCodeForAnalyze,
  compactVarTypes,
} from "../prompt";

// ── compactCodeForAnalyze ─────────────────────────────────────────────────────

describe("compactCodeForAnalyze", () => {
  it("3200자 이하 코드는 그대로 반환한다", () => {
    const code = "x = 1\nprint(x)";
    expect(compactCodeForAnalyze(code)).toBe(code);
  });

  it("3200자 초과 코드는 head + tail로 잘라서 반환한다", () => {
    const code = "a".repeat(4000);
    const result = compactCodeForAnalyze(code);
    expect(result.length).toBeLessThan(code.length);
    expect(result).toContain("truncated for token optimization");
  });

  it("결과에 head 80%와 tail 20%가 포함된다", () => {
    const head = "H".repeat(3000);
    const tail = "T".repeat(1000);
    const code = head + tail;
    const result = compactCodeForAnalyze(code);
    expect(result.startsWith("H")).toBe(true);
    expect(result.endsWith("T")).toBe(true);
  });
});

// ── compactVarTypes ───────────────────────────────────────────────────────────

describe("compactVarTypes", () => {
  it("40개 이하 varTypes는 그대로 반환한다", () => {
    const vt = { a: "int", b: "list" };
    expect(compactVarTypes(vt)).toEqual(vt);
  });

  it("40개 초과 varTypes는 40개로 자른다", () => {
    const vt: Record<string, string> = {};
    for (let i = 0; i < 50; i++) vt[`v${i}`] = "int";
    const result = compactVarTypes(vt);
    expect(Object.keys(result).length).toBe(ANALYZE_VAR_TYPES_LIMIT);
  });
});

// ── ANALYZE_GEMINI_SCHEMA ─────────────────────────────────────────────────────

describe("ANALYZE_GEMINI_SCHEMA", () => {
  const schema = ANALYZE_GEMINI_SCHEMA as Record<string, unknown>;

  it("required 필드 6개를 포함한다", () => {
    const required = schema.required as string[];
    expect(required).toContain("algorithm");
    expect(required).toContain("display_name");
    expect(required).toContain("strategy");
    expect(required).toContain("key_vars");
    expect(required).toContain("var_mapping_list");
    expect(required).toContain("tags");
  });

  it("properties에 핵심 키가 존재한다", () => {
    const props = schema.properties as Record<string, unknown>;
    expect(props.algorithm).toBeDefined();
    expect(props.strategy).toBeDefined();
    expect(props.linear_pivots).toBeDefined();
    expect(props.special_var_kinds).toBeDefined();
    expect(props.graph_mode).toBeDefined();
  });
});

// ── 상수 ──────────────────────────────────────────────────────────────────────

describe("상수", () => {
  it("ANALYZE_CODE_CHAR_LIMIT는 5000이다", () => {
    expect(ANALYZE_CODE_CHAR_LIMIT).toBe(5000);
  });

  it("ANALYZE_VAR_TYPES_LIMIT는 40이다", () => {
    expect(ANALYZE_VAR_TYPES_LIMIT).toBe(40);
  });
});
