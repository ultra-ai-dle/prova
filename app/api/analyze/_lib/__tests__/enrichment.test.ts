import { describe, it, expect } from "vitest";
import type { AnalyzeMetadata } from "@/types/prova";
import {
  applyLanguageEnricher,
  applyDirectionMapGuards,
  applyGraphModeInference,
  enrichLinearPivots,
} from "../enrichment";
import { applyPythonEnricher } from "../enrichers/python";
import { applyJsEnricher }     from "../enrichers/javascript";
import { applyJavaEnricher }   from "../enrichers/java";

const baseMeta: AnalyzeMetadata = {
  algorithm: "Test",
  display_name: "Test",
  strategy: "LINEAR",
  tags: [],
  uses_bitmasking: false,
  key_vars: [],
  var_mapping: {},
};

// ── applyPythonEnricher (구 applyDequeHints + enrichSpecialVarKinds) ──────────

describe("applyPythonEnricher — deque / var_mapping", () => {
  it("deque 변수가 없으면 meta를 그대로 반환한다", () => {
    const code = "x = [1, 2, 3]";
    expect(applyPythonEnricher(baseMeta, code, { x: "list" })).toEqual(baseMeta);
  });

  it("deque + popleft 패턴이면 QUEUE 태그와 var_mapping을 추가한다", () => {
    const code = "q = deque()\nq.append(1)\nq.popleft()";
    const result = applyPythonEnricher(baseMeta, code, { q: "deque" });
    expect(result.tags).toContain("queue");
    expect(result.var_mapping.QUEUE).toBeDefined();
    expect(result.var_mapping.QUEUE?.var_name).toBe("q");
  });

  it("deque + appendleft 패턴이면 stack 태그를 추가한다", () => {
    const code = "d = deque()\nd.appendleft(1)\nd.pop()";
    const result = applyPythonEnricher(baseMeta, code, { d: "deque" });
    expect(result.tags).toContain("stack");
  });

  it("GRID strategy를 GRID_LINEAR로 전환한다", () => {
    const meta = { ...baseMeta, strategy: "GRID" as const };
    const code = "q = deque()\nq.append(1)\nq.popleft()";
    const result = applyPythonEnricher(meta, code, { q: "deque" });
    expect(result.strategy).toBe("GRID_LINEAR");
  });
});

describe("applyPythonEnricher — special_var_kinds", () => {
  it("heapq 패턴이 있으면 HEAP으로 감지한다", () => {
    const code = "hq = []\nheapq.heappush(hq, 1)\nheapq.heappop(hq)";
    const result = applyPythonEnricher(baseMeta, code, { hq: "list" });
    expect(result.special_var_kinds?.hq).toBe("HEAP");
  });

  it("deque + popleft만 사용하면 QUEUE로 감지한다", () => {
    const code = "q = deque()\nq.append(1)\nq.popleft()";
    const result = applyPythonEnricher(baseMeta, code, { q: "deque" });
    expect(result.special_var_kinds?.q).toBe("QUEUE");
  });

  it("deque + appendleft + popleft 사용하면 DEQUE로 감지한다", () => {
    const code = "d = deque()\nd.appendleft(1)\nd.popleft()";
    const result = applyPythonEnricher(baseMeta, code, { d: "deque" });
    expect(result.special_var_kinds?.d).toBe("DEQUE");
  });

  it("list + append + pop 사용하면 STACK으로 감지한다", () => {
    const code = "st = []\nst.append(1)\nst.pop()";
    const result = applyPythonEnricher(baseMeta, code, { st: "list" });
    expect(result.special_var_kinds?.st).toBe("STACK");
  });

  it("AI가 이미 채운 항목은 덮어쓰지 않는다", () => {
    const meta = { ...baseMeta, special_var_kinds: { hq: "QUEUE" as const } };
    const code = "hq = []\nheapq.heappush(hq, 1)";
    const result = applyPythonEnricher(meta, code, { hq: "list" });
    expect(result.special_var_kinds?.hq).toBe("QUEUE");
  });
});

// ── applyJsEnricher (키워드 의존 제거, 연산 패턴만) ──────────────────────────

describe("applyJsEnricher — 연산 패턴 기반 (키워드 없음)", () => {
  it("array 변수가 없으면 meta를 그대로 반환한다", () => {
    const code = "let x = 5;";
    expect(applyJsEnricher(baseMeta, code, { x: "int" })).toEqual(baseMeta);
  });

  it("push+pop만 있으면 STACK — DFS 키워드 없어도 감지", () => {
    const code = "let s = [];\ns.push(1);\ns.pop();";
    const result = applyJsEnricher(baseMeta, code, { s: "list" });
    expect(result.special_var_kinds?.s).toBe("STACK");
    expect(result.var_mapping.STACK?.var_name).toBe("s");
  });

  it("push+shift 있으면 QUEUE — BFS 키워드 없어도 감지", () => {
    const code = "let q = [];\nq.push(1);\nq.shift();";
    const result = applyJsEnricher(baseMeta, code, { q: "list" });
    expect(result.special_var_kinds?.q).toBe("QUEUE");
    expect(result.var_mapping.QUEUE?.var_name).toBe("q");
  });

  it("push+pop+unshift+shift 모두 있으면 DEQUE", () => {
    const code = "let d = [];\nd.push(1);\nd.unshift(2);\nd.pop();\nd.shift();";
    const result = applyJsEnricher(baseMeta, code, { d: "list" });
    expect(result.special_var_kinds?.d).toBe("DEQUE");
  });

  it("GRID strategy를 GRID_LINEAR로 전환한다", () => {
    const meta = { ...baseMeta, strategy: "GRID" as const };
    const code = "let s = [];\ns.push(1);\ns.pop();";
    const result = applyJsEnricher(meta, code, { s: "list" });
    expect(result.strategy).toBe("GRID_LINEAR");
  });
});

// ── applyJavaEnricher ─────────────────────────────────────────────────────────

describe("applyJavaEnricher — 타입 선언 + 연산 패턴", () => {
  it("ArrayDeque + offer+poll이면 QUEUE", () => {
    const code = "ArrayDeque<Integer> q = new ArrayDeque<>();\nq.offer(1);\nq.poll();";
    const result = applyJavaEnricher(baseMeta, code, { q: "list" });
    expect(result.special_var_kinds?.q).toBe("QUEUE");
    expect(result.var_mapping.QUEUE?.var_name).toBe("q");
  });

  it("ArrayDeque + addFirst+addLast이면 DEQUE", () => {
    const code = "ArrayDeque<Integer> d = new ArrayDeque<>();\nd.addFirst(1);\nd.addLast(2);\nd.removeFirst();";
    const result = applyJavaEnricher(baseMeta, code, { d: "list" });
    expect(result.special_var_kinds?.d).toBe("DEQUE");
  });

  it("ArrayDeque + push+pop이면 STACK", () => {
    const code = "ArrayDeque<Integer> st = new ArrayDeque<>();\nst.push(1);\nst.pop();";
    const result = applyJavaEnricher(baseMeta, code, { st: "list" });
    expect(result.special_var_kinds?.st).toBe("STACK");
  });

  it("PriorityQueue + offer+poll이면 HEAP", () => {
    const code = "PriorityQueue<Integer> pq = new PriorityQueue<>();\npq.offer(1);\npq.poll();";
    const result = applyJavaEnricher(baseMeta, code, { pq: "list" });
    expect(result.special_var_kinds?.pq).toBe("HEAP");
    expect(result.var_mapping.HEAP?.var_name).toBe("pq");
  });

  it("AI가 이미 채운 항목은 덮어쓰지 않는다", () => {
    const meta = { ...baseMeta, special_var_kinds: { pq: "STACK" as const } };
    const code = "PriorityQueue<Integer> pq = new PriorityQueue<>();\npq.offer(1);\npq.poll();";
    const result = applyJavaEnricher(meta, code, { pq: "list" });
    expect(result.special_var_kinds?.pq).toBe("STACK");
  });
});

// ── applyLanguageEnricher 디스패처 ────────────────────────────────────────────

describe("applyLanguageEnricher — 언어별 라우팅", () => {
  it("python → applyPythonEnricher 호출", () => {
    const code = "q = deque()\nq.append(1)\nq.popleft()";
    const result = applyLanguageEnricher(baseMeta, code, { q: "deque" }, "python");
    expect(result.special_var_kinds?.q).toBe("QUEUE");
  });

  it("javascript → applyJsEnricher 호출", () => {
    const code = "let s = [];\ns.push(1);\ns.pop();";
    const result = applyLanguageEnricher(baseMeta, code, { s: "list" }, "javascript");
    expect(result.special_var_kinds?.s).toBe("STACK");
  });

  it("java → applyJavaEnricher 호출", () => {
    const code = "PriorityQueue<Integer> pq = new PriorityQueue<>();\npq.offer(1);\npq.poll();";
    const result = applyLanguageEnricher(baseMeta, code, { pq: "list" }, "java");
    expect(result.special_var_kinds?.pq).toBe("HEAP");
  });

  it("알 수 없는 언어는 meta를 그대로 반환한다", () => {
    const result = applyLanguageEnricher(baseMeta, "x = 1", { x: "int" }, "ruby");
    expect(result).toBe(baseMeta);
  });
});

// ── applyDirectionMapGuards ───────────────────────────────────────────────────

describe("applyDirectionMapGuards", () => {
  it("방향 맵 변수가 없으면 meta를 그대로 반환한다", () => {
    const code = "x = {}\nprint(x)";
    expect(applyDirectionMapGuards(baseMeta, code)).toBe(baseMeta);
  });

  it("방향 맵이 감지되면 var_mapping과 key_vars에서 제거한다", () => {
    const meta = {
      ...baseMeta,
      var_mapping: { DIR: { var_name: "dirs", panel: "VARIABLES" as const } },
      key_vars: ["dirs", "board"],
    };
    const code = 'dirs = {"U": (0, 1), "D": (0, -1)}';
    const result = applyDirectionMapGuards(meta, code);
    expect(result.var_mapping.DIR).toBeUndefined();
    expect(result.key_vars).not.toContain("dirs");
    expect(result.key_vars).toContain("board");
  });
});

// ── applyGraphModeInference ───────────────────────────────────────────────────

describe("applyGraphModeInference", () => {
  it("이미 graph_mode가 있으면 그대로 반환한다", () => {
    const meta = { ...baseMeta, graph_mode: "directed" as const };
    const result = applyGraphModeInference(meta, "any code");
    expect(result.graph_mode).toBe("directed");
  });

  it("추론 불가하면 graph_mode를 설정하지 않는다", () => {
    const result = applyGraphModeInference(baseMeta, "x = 1");
    expect(result.graph_mode).toBeUndefined();
  });
});

// ── enrichLinearPivots ────────────────────────────────────────────────────────

describe("enrichLinearPivots", () => {
  it("이미 linear_pivots가 있으면 그대로 반환한다", () => {
    const meta = { ...baseMeta, linear_pivots: [{ var_name: "i" }] };
    const result = enrichLinearPivots(meta, "any", { i: "int", j: "int", arr: "list" });
    expect(result.linear_pivots).toEqual([{ var_name: "i" }]);
  });

  it("투포인터 패턴이면 linear_pivots를 자동 생성한다", () => {
    const code = "arr[s]\narr[e]\ns += 1\ne -= 1";
    const result = enrichLinearPivots(baseMeta, code, { s: "int", e: "int", arr: "list" });
    expect(result.linear_pivots).toBeDefined();
    expect(result.linear_pivots?.length).toBe(2);
    expect(result.linear_pivots?.[0].pivot_mode).toBe("index");
  });

  it("int 변수가 1개뿐이면 그대로 반환한다", () => {
    const code = "arr[i]\ni += 1";
    const result = enrichLinearPivots(baseMeta, code, { i: "int", arr: "list" });
    expect(result.linear_pivots).toBeUndefined();
  });
});
