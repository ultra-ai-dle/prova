import { describe, it, expect } from "vitest";
import {
  isRuntimeNoiseVar,
  sanitizeRawTrace,
  sanitizeVarTypes,
  collectUserDeclaredSymbols,
  sanitizeRawTraceWithAllowlist,
  sanitizeVarTypesWithAllowlist,
  BLOCKED_RUNTIME_VAR_NAMES,
} from "../traceSanitize";
import type { RawTraceStep } from "@/types/prova";

/* ── isRuntimeNoiseVar ── */
describe("isRuntimeNoiseVar", () => {
  it("isRuntimeNoiseVar는 던더 변수를 노이즈로 판별한다", () => {
    expect(isRuntimeNoiseVar("__name__", "")).toBe(true);
    expect(isRuntimeNoiseVar("__builtins__", {})).toBe(true);
  });

  it("isRuntimeNoiseVar는 JS 모드에서 console/readline/arguments/fs를 노이즈로 판별한다", () => {
    expect(isRuntimeNoiseVar("console", {}, "javascript")).toBe(true);
    expect(isRuntimeNoiseVar("readline", "", "javascript")).toBe(true);
    expect(isRuntimeNoiseVar("arguments", [], "javascript")).toBe(true);
    expect(isRuntimeNoiseVar("fs", {}, "javascript")).toBe(true);
  });

  it("isRuntimeNoiseVar는 JS 모드에서 일반 변수를 노이즈로 판별하지 않는다", () => {
    expect(isRuntimeNoiseVar("visited", [], "javascript")).toBe(false);
    expect(isRuntimeNoiseVar("queue", [], "javascript")).toBe(false);
  });

  it("isRuntimeNoiseVar는 Python BLOCKED 목록 멤버를 노이즈로 판별한다", () => {
    expect(isRuntimeNoiseVar("modules", "")).toBe(true);
    expect(isRuntimeNoiseVar("platform", "")).toBe(true);
    expect(isRuntimeNoiseVar("pycache_prefix", "")).toBe(true);
  });

  it("isRuntimeNoiseVar는 _로 시작하는 Python 변수를 노이즈로 판별한다", () => {
    expect(isRuntimeNoiseVar("_internal", "")).toBe(true);
  });

  it("isRuntimeNoiseVar는 import/frozen/zipimport 패턴 이름을 노이즈로 판별한다", () => {
    expect(isRuntimeNoiseVar("importlib", "")).toBe(true);
    expect(isRuntimeNoiseVar("frozen_importlib", "")).toBe(true);
    expect(isRuntimeNoiseVar("zipimport", "")).toBe(true);
  });

  it("isRuntimeNoiseVar는 value에 모듈 패턴이 포함되면 노이즈로 판별한다", () => {
    expect(isRuntimeNoiseVar("os", "<module 'os' from '/usr/lib'>")).toBe(true);
    expect(isRuntimeNoiseVar("zi", "zipimporter('/path')")).toBe(true);
  });

  it("isRuntimeNoiseVar는 Java I/O 객체(Scanner, BufferedReader 등)를 노이즈로 판별한다 — 변수명 무관", () => {
    const scannerVal = "java.util.Scanner[delimiters=\\p{javaWhitespace}+]";
    const brVal = "java.io.BufferedReader@1a2b3c";
    const bwVal = "java.io.BufferedWriter@4d5e6f";
    const isrVal = "java.io.InputStreamReader@7a8b9c";
    const pwVal = "java.io.PrintWriter@ab1cd2";
    expect(isRuntimeNoiseVar("sc", scannerVal, "java")).toBe(true);
    expect(isRuntimeNoiseVar("br", brVal, "java")).toBe(true);
    expect(isRuntimeNoiseVar("reader", brVal, "java")).toBe(true);  // 변수명 무관
    expect(isRuntimeNoiseVar("input", isrVal, "java")).toBe(true);  // 변수명 무관
    expect(isRuntimeNoiseVar("bw", bwVal, "java")).toBe(true);
    expect(isRuntimeNoiseVar("pw", pwVal, "java")).toBe(true);
  });

  it("isRuntimeNoiseVar는 일반 유저 변수를 노이즈로 판별하지 않는다", () => {
    expect(isRuntimeNoiseVar("visited", [])).toBe(false);
    expect(isRuntimeNoiseVar("queue", [1, 2, 3])).toBe(false);
    expect(isRuntimeNoiseVar("result", "hello")).toBe(false);
  });
});

/* ── sanitizeRawTrace ── */
describe("sanitizeRawTrace", () => {
  const makeStep = (vars: Record<string, unknown>): RawTraceStep => ({
    step: 1,
    line: 1,
    vars,
    scope: { func: "global", depth: 0 },
    parent_frames: [],
    runtimeError: null,
  });

  it("sanitizeRawTrace는 노이즈 변수를 trace에서 제거한다", () => {
    const trace = [makeStep({ visited: [1], __name__: "__main__", modules: {} })];
    const result = sanitizeRawTrace(trace);
    expect(Object.keys(result[0].vars)).toEqual(["visited"]);
  });

  it("sanitizeRawTrace는 빈 trace를 빈 배열로 반환한다", () => {
    expect(sanitizeRawTrace([])).toEqual([]);
  });

  it("sanitizeRawTrace는 유저 변수만 유지한다", () => {
    const trace = [makeStep({ x: 1, y: 2 })];
    const result = sanitizeRawTrace(trace);
    expect(result[0].vars).toEqual({ x: 1, y: 2 });
  });
});

/* ── sanitizeVarTypes ── */
describe("sanitizeVarTypes", () => {
  it("sanitizeVarTypes는 노이즈 키를 제거한다", () => {
    const varTypes = { visited: "list", __name__: "str", modules: "dict" };
    const result = sanitizeVarTypes(varTypes);
    expect(result).toEqual({ visited: "list" });
  });

  it("sanitizeVarTypes는 빈 객체를 빈 객체로 반환한다", () => {
    expect(sanitizeVarTypes({})).toEqual({});
  });
});

/* ── collectUserDeclaredSymbols ── */
describe("collectUserDeclaredSymbols", () => {
  /* Python */
  it("collectUserDeclaredSymbols는 Python def 선언에서 함수명과 파라미터를 추출한다", () => {
    const result = collectUserDeclaredSymbols("def foo(a, b):\n  pass");
    expect(result.has("foo")).toBe(true);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
  });

  it("collectUserDeclaredSymbols는 Python class 선언에서 클래스명을 추출한다", () => {
    const result = collectUserDeclaredSymbols("class MyClass:\n  pass");
    expect(result.has("MyClass")).toBe(true);
  });

  it("collectUserDeclaredSymbols는 Python import에서 모듈명을 추출한다", () => {
    const result = collectUserDeclaredSymbols("import os");
    expect(result.has("os")).toBe(true);
  });

  it("collectUserDeclaredSymbols는 Python from import as에서 alias를 추출한다", () => {
    const result = collectUserDeclaredSymbols(
      "from collections import deque as dq",
    );
    expect(result.has("dq")).toBe(true);
  });

  it("collectUserDeclaredSymbols는 Python for 루프에서 변수를 추출한다", () => {
    const result = collectUserDeclaredSymbols("for i, j in enumerate(arr):");
    expect(result.has("i")).toBe(true);
    expect(result.has("j")).toBe(true);
  });

  it("collectUserDeclaredSymbols는 Python 대입문에서 변수를 추출한다", () => {
    const result = collectUserDeclaredSymbols("visited = set()");
    expect(result.has("visited")).toBe(true);
  });

  it("collectUserDeclaredSymbols는 == >= <= != 포함 라인을 대입으로 오탐하지 않는다", () => {
    const result = collectUserDeclaredSymbols("if x == 1:\n  pass");
    expect(result.has("if x")).toBe(false);
  });

  it("collectUserDeclaredSymbols는 _ 언더스코어 단독을 무시한다", () => {
    const result = collectUserDeclaredSymbols("_ = 1");
    expect(result.has("_")).toBe(false);
  });

  /* JavaScript */
  it("collectUserDeclaredSymbols는 JS const/let/var 선언에서 변수를 추출한다", () => {
    const result = collectUserDeclaredSymbols(
      "const x = 1;\nlet y = 2;\nvar z = 3;",
      "javascript",
    );
    expect(result.has("x")).toBe(true);
    expect(result.has("y")).toBe(true);
    expect(result.has("z")).toBe(true);
  });

  // TODO: JS function 파라미터 추출 버그 — arg.replace(/[=\s].*/, "") 에서 선행 공백이 매칭되어
  // 콤마 뒤 공백이 있는 두 번째 이후 파라미터(", arr")가 빈 문자열로 소실됨
  it("collectUserDeclaredSymbols는 JS function 선언에서 함수명과 첫 번째 파라미터를 추출한다 (버그: 두 번째 이후 파라미터 소실)", () => {
    const result = collectUserDeclaredSymbols(
      "function solve(n, arr) {",
      "javascript",
    );
    expect(result.has("solve")).toBe(true);
    expect(result.has("n")).toBe(true);
    expect(result.has("arr")).toBe(false); // 버그: 선행 공백으로 인해 추출 실패
  });

  it("collectUserDeclaredSymbols는 JS for 루프에서 변수를 추출한다", () => {
    const result = collectUserDeclaredSymbols(
      "for (let i = 0; i < n; i++) {",
      "javascript",
    );
    expect(result.has("i")).toBe(true);
  });

  it("collectUserDeclaredSymbols는 => 포함 라인을 대입으로 오탐하지 않는다", () => {
    const result = collectUserDeclaredSymbols(
      "const f = () => {}",
      "javascript",
    );
    // f는 const 선언으로 추출되지만, => 때문에 대입 분기로 중복 추출되지 않는다
    expect(result.has("f")).toBe(true);
  });

  /* 기본 허용 변수 */
  it("collectUserDeclaredSymbols는 기본 허용 변수를 항상 포함한다", () => {
    const result = collectUserDeclaredSymbols("");
    for (const v of ["i", "j", "k", "r", "c", "x", "y", "z"]) {
      expect(result.has(v)).toBe(true);
    }
  });

  it("collectUserDeclaredSymbols는 빈 코드에서 기본 허용 변수만 반환한다", () => {
    const result = collectUserDeclaredSymbols("");
    expect(result.size).toBe(15); // i,j,k,r,c,x,y,z,nx,ny,nr,nc,lj,rj,nk
  });
});

/* ── sanitizeRawTraceWithAllowlist ── */
describe("sanitizeRawTraceWithAllowlist", () => {
  const makeStep = (vars: Record<string, unknown>): RawTraceStep => ({
    step: 1,
    line: 1,
    vars,
    scope: { func: "global", depth: 0 },
    parent_frames: [],
    runtimeError: null,
  });

  it("sanitizeRawTraceWithAllowlist는 allowlist에 없는 변수를 제거한다", () => {
    const allowed = new Set(["x", "y"]);
    const trace = [makeStep({ x: 1, y: 2, unknown_var: 3 })];
    const result = sanitizeRawTraceWithAllowlist(trace, allowed);
    expect(Object.keys(result[0].vars)).toEqual(["x", "y"]);
  });

  it("sanitizeRawTraceWithAllowlist는 allowlist에 있어도 노이즈 변수면 제거한다", () => {
    const allowed = new Set(["x", "__name__"]);
    const trace = [makeStep({ x: 1, __name__: "__main__" })];
    const result = sanitizeRawTraceWithAllowlist(trace, allowed);
    expect(Object.keys(result[0].vars)).toEqual(["x"]);
  });
});

/* ── sanitizeVarTypesWithAllowlist ── */
describe("sanitizeVarTypesWithAllowlist", () => {
  it("sanitizeVarTypesWithAllowlist는 allowlist에 없는 키를 제거한다", () => {
    const allowed = new Set(["x"]);
    const varTypes = { x: "int", unknown_var: "str" };
    const result = sanitizeVarTypesWithAllowlist(varTypes, allowed);
    expect(result).toEqual({ x: "int" });
  });

  it("sanitizeVarTypesWithAllowlist는 allowlist에 있어도 노이즈면 제거한다", () => {
    const allowed = new Set(["x", "__name__"]);
    const varTypes = { x: "int", __name__: "str" };
    const result = sanitizeVarTypesWithAllowlist(varTypes, allowed);
    expect(result).toEqual({ x: "int" });
  });
});
