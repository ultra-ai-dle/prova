import { describe, it, expect } from "vitest";
import { highlightJsLine, highlightPythonLine } from "../syntaxHighlight";

describe("highlightJsLine", () => {
  /* ── 빈 입력 ── */
  it("highlightJsLine는 빈 문자열일 때 공백 토큰을 반환한다", () => {
    const result = highlightJsLine("");
    expect(result).toEqual([{ text: " ", className: "text-[#c9d1d9]" }]);
  });

  /* ── 주석 ── */
  it("highlightJsLine는 // 주석을 italic 스타일로 분류한다", () => {
    const result = highlightJsLine("// comment");
    expect(result).toEqual([
      { text: "// comment", className: "text-[#8b949e] italic" },
    ]);
  });

  it("highlightJsLine는 코드 뒤 인라인 주석을 분리한다", () => {
    const result = highlightJsLine("x // comment");
    const comment = result.find((t) => t.text === "// comment");
    expect(comment?.className).toBe("text-[#8b949e] italic");
  });

  /* ── 문자열 ── */
  it("highlightJsLine는 더블쿼트 문자열을 문자열색으로 분류한다", () => {
    const result = highlightJsLine('"hello"');
    expect(result).toEqual([
      { text: '"hello"', className: "text-[#a5d6ff]" },
    ]);
  });

  it("highlightJsLine는 싱글쿼트 문자열을 문자열색으로 분류한다", () => {
    const result = highlightJsLine("'world'");
    expect(result).toEqual([
      { text: "'world'", className: "text-[#a5d6ff]" },
    ]);
  });

  it("highlightJsLine는 백틱 템플릿 리터럴을 문자열색으로 분류한다", () => {
    const result = highlightJsLine("`template`");
    expect(result).toEqual([
      { text: "`template`", className: "text-[#a5d6ff]" },
    ]);
  });

  it("highlightJsLine는 이스케이프가 포함된 문자열을 하나의 토큰으로 처리한다", () => {
    const result = highlightJsLine('"he\\"llo"');
    const strToken = result.find((t) => t.className === "text-[#a5d6ff]");
    expect(strToken).toBeDefined();
    expect(strToken!.text).toContain("he");
  });

  /* ── 숫자 ── */
  it("highlightJsLine는 정수를 숫자색으로 분류한다", () => {
    const result = highlightJsLine("42");
    expect(result).toEqual([{ text: "42", className: "text-[#79c0ff]" }]);
  });

  it("highlightJsLine는 소수점 숫자를 숫자색으로 분류한다", () => {
    const result = highlightJsLine("3.14");
    expect(result).toEqual([{ text: "3.14", className: "text-[#79c0ff]" }]);
  });

  /* ── 키워드 ── */
  it("highlightJsLine는 JS 키워드를 키워드색으로 분류한다", () => {
    const result = highlightJsLine("const");
    expect(result).toEqual([{ text: "const", className: "text-[#ff7b72]" }]);
  });

  it("highlightJsLine는 function 키워드를 키워드색으로 분류한다", () => {
    const result = highlightJsLine("function");
    expect(result).toEqual([
      { text: "function", className: "text-[#ff7b72]" },
    ]);
  });

  /* ── 식별자 ── */
  it("highlightJsLine는 일반 식별자를 식별자색으로 분류한다", () => {
    const result = highlightJsLine("myVar");
    expect(result).toEqual([{ text: "myVar", className: "text-[#d2a8ff]" }]);
  });

  // TODO: $접두 식별자 버그 — \b가 $ 앞에서 word boundary로 동작하지 않아 "$el"이 "$" + "el"로 분리됨
  it("highlightJsLine는 $ 접두 식별자를 분리하여 처리한다 (버그: $가 갭으로 분류됨)", () => {
    const result = highlightJsLine("$el");
    expect(result).toEqual([
      { text: "$", className: "text-[#c9d1d9]" },
      { text: "el", className: "text-[#d2a8ff]" },
    ]);
  });

  /* ── 갭 텍스트 ── */
  it("highlightJsLine는 연산자/공백을 기본색으로 분류한다", () => {
    const result = highlightJsLine("x + y");
    const gap = result.find((t) => t.text === " + ");
    expect(gap?.className).toBe("text-[#c9d1d9]");
  });

  /* ── 복합 ── */
  it("highlightJsLine는 여러 토큰을 올바른 순서로 반환한다", () => {
    const result = highlightJsLine("const x = 1;");
    expect(result.map((t) => t.text).join("")).toBe("const x = 1;");
    expect(result[0]).toEqual({ text: "const", className: "text-[#ff7b72]" });
  });
});

describe("highlightPythonLine", () => {
  /* ── 빈 입력 ── */
  it("highlightPythonLine는 빈 문자열일 때 공백 토큰을 반환한다", () => {
    const result = highlightPythonLine("");
    expect(result).toEqual([{ text: " ", className: "text-[#c9d1d9]" }]);
  });

  /* ── 주석 ── */
  it("highlightPythonLine는 # 주석을 italic 스타일로 분류한다", () => {
    const result = highlightPythonLine("# comment");
    expect(result).toEqual([
      { text: "# comment", className: "text-[#8b949e] italic" },
    ]);
  });

  it("highlightPythonLine는 코드 뒤 인라인 주석을 분리한다", () => {
    const result = highlightPythonLine("x # comment");
    const comment = result.find((t) => t.text === "# comment");
    expect(comment?.className).toBe("text-[#8b949e] italic");
  });

  /* ── 문자열 ── */
  it("highlightPythonLine는 더블쿼트 문자열을 문자열색으로 분류한다", () => {
    const result = highlightPythonLine('"hello"');
    expect(result).toEqual([
      { text: '"hello"', className: "text-[#a5d6ff]" },
    ]);
  });

  it("highlightPythonLine는 싱글쿼트 문자열을 문자열색으로 분류한다", () => {
    const result = highlightPythonLine("'world'");
    expect(result).toEqual([
      { text: "'world'", className: "text-[#a5d6ff]" },
    ]);
  });

  /* ── 숫자 ── */
  it("highlightPythonLine는 정수를 숫자색으로 분류한다", () => {
    const result = highlightPythonLine("42");
    expect(result).toEqual([{ text: "42", className: "text-[#79c0ff]" }]);
  });

  /* ── 키워드 ── */
  it("highlightPythonLine는 Python 키워드를 키워드색으로 분류한다", () => {
    const result = highlightPythonLine("def");
    expect(result).toEqual([{ text: "def", className: "text-[#ff7b72]" }]);
  });

  it("highlightPythonLine는 elif 키워드를 키워드색으로 분류한다", () => {
    const result = highlightPythonLine("elif");
    expect(result).toEqual([{ text: "elif", className: "text-[#ff7b72]" }]);
  });

  /* ── 식별자 ── */
  it("highlightPythonLine는 일반 식별자를 식별자색으로 분류한다", () => {
    const result = highlightPythonLine("my_var");
    expect(result).toEqual([{ text: "my_var", className: "text-[#d2a8ff]" }]);
  });

  /* ── 복합 ── */
  it("highlightPythonLine는 여러 토큰을 올바른 순서로 반환한다", () => {
    const result = highlightPythonLine("def foo(x):");
    expect(result.map((t) => t.text).join("")).toBe("def foo(x):");
    expect(result[0]).toEqual({ text: "def", className: "text-[#ff7b72]" });
  });

  /* ── Python에서 JS 키워드 ── */
  it("highlightPythonLine는 JS 키워드를 식별자로 분류한다", () => {
    const result = highlightPythonLine("const");
    expect(result).toEqual([{ text: "const", className: "text-[#d2a8ff]" }]);
  });
});

describe("공통 동작", () => {
  it("토큰 텍스트를 이어붙이면 원본 라인과 동일하다", () => {
    const lines = [
      "const x = foo(42, 'bar');",
      "def solve(n): # hello",
      "",
      "  return x + y;",
    ];
    for (const line of lines) {
      const jsResult = highlightJsLine(line).map((t) => t.text).join("");
      const pyResult = highlightPythonLine(line).map((t) => t.text).join("");
      if (line === "") {
        expect(jsResult).toBe(" ");
        expect(pyResult).toBe(" ");
      } else {
        expect(jsResult).toBe(line);
        expect(pyResult).toBe(line);
      }
    }
  });
});
