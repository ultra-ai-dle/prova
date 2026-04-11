import { describe, it, expect } from "vitest";
import {
  detectLanguageFromCode,
  PY_KEYWORDS,
  JS_KEYWORDS,
  PYTHON_LANGUAGE_HINTS,
  JAVASCRIPT_LANGUAGE_HINTS,
} from "../languageDetection";

describe("detectLanguageFromCode", () => {
  /* ── 빈 입력 ── */
  it("detectLanguageFromCode는 빈 문자열일 때 fallback을 반환한다", () => {
    expect(detectLanguageFromCode("")).toBe("python");
  });

  it("detectLanguageFromCode는 공백/줄바꿈만 있을 때 fallback을 반환한다", () => {
    expect(detectLanguageFromCode("   \n\n  ")).toBe("python");
  });

  it("detectLanguageFromCode는 fallback 미지정 시 기본값 python을 반환한다", () => {
    expect(detectLanguageFromCode("")).toBe("python");
  });

  /* ── Python 명확 ── */
  it("detectLanguageFromCode는 def 선언이 있을 때 python을 반환한다", () => {
    expect(detectLanguageFromCode("def foo():\n  pass")).toBe("python");
  });

  it("detectLanguageFromCode는 class 선언이 있을 때 python을 반환한다", () => {
    expect(detectLanguageFromCode("class Foo(Bar):\n  pass")).toBe("python");
  });

  it("detectLanguageFromCode는 블록 구문 + print 조합일 때 python을 반환한다", () => {
    const code = "if x:\n  print(y)\nelif z:\n  pass";
    expect(detectLanguageFromCode(code)).toBe("python");
  });

  /* ── JavaScript 명확 ── */
  it("detectLanguageFromCode는 const 선언이 있을 때 javascript를 반환한다", () => {
    expect(detectLanguageFromCode("const x = 1;\nconst y = 2;")).toBe(
      "javascript",
    );
  });

  it("detectLanguageFromCode는 function 선언이 있을 때 javascript를 반환한다", () => {
    expect(detectLanguageFromCode("function foo() {\n  return 1;\n}")).toBe(
      "javascript",
    );
  });

  it("detectLanguageFromCode는 화살표 함수 + console.log일 때 javascript를 반환한다", () => {
    const code = "const f = () => {\n  console.log(1);\n};";
    expect(detectLanguageFromCode(code)).toBe("javascript");
  });

  /* ── 키워드 매칭 ── */
  it("detectLanguageFromCode는 Python 전용 키워드가 많을 때 python을 반환한다", () => {
    const code = "elif nonlocal lambda raise yield";
    expect(detectLanguageFromCode(code)).toBe("python");
  });

  it("detectLanguageFromCode는 JS 전용 키워드가 많을 때 javascript를 반환한다", () => {
    const code = "instanceof typeof switch void debugger delete";
    expect(detectLanguageFromCode(code)).toBe("javascript");
  });

  /* ── 동점/근접 → fallback ── */
  it("detectLanguageFromCode는 양쪽 키워드가 혼재할 때 fallback을 반환한다", () => {
    const code = "if else for while return break";
    expect(detectLanguageFromCode(code)).toBe("python");
  });

  it("detectLanguageFromCode는 fallback을 javascript로 지정하면 모호한 코드에서 javascript를 반환한다", () => {
    const code = "if else for while return break";
    expect(detectLanguageFromCode(code, "javascript")).toBe("javascript");
  });

  /* ── 주석과 구문 패턴 ── */
  // TODO: 주석 내 키워드가 단어 매칭 스코어에 반영되는 버그 수정 후 아래 테스트 기대값 업데이트 필요
  it("detectLanguageFromCode는 주석 내 구문 패턴(def/class/const 등)을 라인 스코어에 반영하지 않는다", () => {
    const code = "const x = 1;\n# def foo():\nconst y = 2;";
    expect(detectLanguageFromCode(code)).toBe("javascript");
  });

  it("detectLanguageFromCode는 JS 주석 내 구문 패턴을 라인 스코어에 반영하지 않는다", () => {
    const code = "function solve() {\n  // def foo():\n  return 1;\n}";
    expect(detectLanguageFromCode(code)).toBe("javascript");
  });

  /* ── 복합 코드 ── */
  it("detectLanguageFromCode는 실제 Python BFS 코드를 python으로 판별한다", () => {
    const code = `from collections import deque

def bfs(graph, start):
    visited = set()
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node in visited:
            continue
        visited.add(node)
        for neighbor in graph[node]:
            queue.append(neighbor)
    return visited`;
    expect(detectLanguageFromCode(code)).toBe("python");
  });

  it("detectLanguageFromCode는 실제 JavaScript BFS 코드를 javascript로 판별한다", () => {
    const code = `function bfs(graph, start) {
  const visited = new Set();
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of graph[node]) {
      queue.push(neighbor);
    }
  }
  return visited;
}`;
    expect(detectLanguageFromCode(code)).toBe("javascript");
  });
});

/* ── 상수 검증 ── */
describe("PY_KEYWORDS", () => {
  it("PY_KEYWORDS는 Python 전용 키워드를 포함한다", () => {
    expect(PY_KEYWORDS.has("def")).toBe(true);
    expect(PY_KEYWORDS.has("elif")).toBe(true);
    expect(PY_KEYWORDS.has("lambda")).toBe(true);
    expect(PY_KEYWORDS.has("nonlocal")).toBe(true);
  });

  it("PY_KEYWORDS는 JS 전용 키워드를 포함하지 않는다", () => {
    expect(PY_KEYWORDS.has("const")).toBe(false);
    expect(PY_KEYWORDS.has("let")).toBe(false);
    expect(PY_KEYWORDS.has("function")).toBe(false);
    expect(PY_KEYWORDS.has("var")).toBe(false);
  });
});

describe("JS_KEYWORDS", () => {
  it("JS_KEYWORDS는 JS 전용 키워드를 포함한다", () => {
    expect(JS_KEYWORDS.has("const")).toBe(true);
    expect(JS_KEYWORDS.has("let")).toBe(true);
    expect(JS_KEYWORDS.has("function")).toBe(true);
    expect(JS_KEYWORDS.has("typeof")).toBe(true);
  });

  it("JS_KEYWORDS는 Python 전용 키워드를 포함하지 않는다", () => {
    expect(JS_KEYWORDS.has("def")).toBe(false);
    expect(JS_KEYWORDS.has("elif")).toBe(false);
    expect(JS_KEYWORDS.has("lambda")).toBe(false);
    expect(JS_KEYWORDS.has("nonlocal")).toBe(false);
  });
});

describe("LANGUAGE_HINTS", () => {
  it("PYTHON_LANGUAGE_HINTS는 Python 고유 패턴을 포함한다", () => {
    expect(PYTHON_LANGUAGE_HINTS).toContain("def");
    expect(PYTHON_LANGUAGE_HINTS).toContain("elif");
    expect(PYTHON_LANGUAGE_HINTS).toContain("lambda");
  });

  it("JAVASCRIPT_LANGUAGE_HINTS는 JS 고유 패턴을 포함한다", () => {
    expect(JAVASCRIPT_LANGUAGE_HINTS).toContain("function");
    expect(JAVASCRIPT_LANGUAGE_HINTS).toContain("const");
    expect(JAVASCRIPT_LANGUAGE_HINTS).toContain("console");
  });
});
