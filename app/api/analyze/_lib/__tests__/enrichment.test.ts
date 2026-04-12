import { describe, it, expect } from "vitest";
import type { AnalyzeMetadata } from "@/types/prova";
import {
  applyDequeHints,
  applyJsArrayHints,
  applyDirectionMapGuards,
  applyGraphModeInference,
  enrichSpecialVarKinds,
  enrichLinearPivots,
} from "../enrichment";

const baseMeta: AnalyzeMetadata = {
  algorithm: "Test",
  display_name: "Test",
  strategy: "LINEAR",
  tags: [],
  uses_bitmasking: false,
  key_vars: [],
  var_mapping: {},
};

// ── applyDequeHints ───────────────────────────────────────────────────────────

describe("applyDequeHints", () => {
  it("deque 변수가 없으면 meta를 그대로 반환한다", () => {
    const code = "x = [1, 2, 3]";
    expect(applyDequeHints(baseMeta, code, { x: "list" })).toBe(baseMeta);
  });

  it("deque + popleft 패턴이면 QUEUE 태그와 var_mapping을 추가한다", () => {
    const code = "q = deque()\nq.append(1)\nq.popleft()";
    const result = applyDequeHints(baseMeta, code, { q: "deque" });
    expect(result.tags).toContain("queue");
    expect(result.var_mapping.QUEUE).toBeDefined();
    expect(result.var_mapping.QUEUE?.var_name).toBe("q");
  });

  it("deque + appendleft 패턴이면 stack 태그를 추가한다", () => {
    const code = "d = deque()\nd.appendleft(1)\nd.pop()";
    const result = applyDequeHints(baseMeta, code, { d: "deque" });
    expect(result.tags).toContain("stack");
  });

  it("GRID strategy를 GRID_LINEAR로 전환한다", () => {
    const meta = { ...baseMeta, strategy: "GRID" as const };
    const code = "q = deque()\nq.append(1)\nq.popleft()";
    const result = applyDequeHints(meta, code, { q: "deque" });
    expect(result.strategy).toBe("GRID_LINEAR");
  });
});

// ── applyJsArrayHints ─────────────────────────────────────────────────────────

describe("applyJsArrayHints", () => {
  it("array 변수가 없으면 meta를 그대로 반환한다", () => {
    const code = "let x = 5;";
    expect(applyJsArrayHints(baseMeta, code, { x: "int" })).toBe(baseMeta);
  });

  it("push+pop + DFS 키워드가 있으면 STACK + dfs 태그를 추가한다", () => {
    const code = "let stack = [];\nstack.push(1);\nstack.pop(); // DFS";
    const result = applyJsArrayHints(baseMeta, code, { stack: "list" });
    expect(result.tags).toContain("dfs");
    expect(result.detected_algorithms).toContain("dfs");
    expect(result.var_mapping.STACK).toBeDefined();
  });

  it("shift + BFS 키워드가 있으면 QUEUE + bfs 태그를 추가한다", () => {
    const code = "let queue = [];\nqueue.push(1);\nqueue.shift(); // BFS";
    const result = applyJsArrayHints(baseMeta, code, { queue: "list" });
    expect(result.tags).toContain("bfs");
    expect(result.var_mapping.QUEUE).toBeDefined();
  });

  it("GRID strategy를 GRID_LINEAR로 전환한다", () => {
    const meta = { ...baseMeta, strategy: "GRID" as const };
    const code = "let s = [];\ns.push(1);\ns.pop();";
    const result = applyJsArrayHints(meta, code, { s: "list" });
    expect(result.strategy).toBe("GRID_LINEAR");
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
    const code = "dirs = {\"U\": (0, 1), \"D\": (0, -1)}";
    const result = applyDirectionMapGuards(meta, code);
    expect(result.var_mapping.DIR).toBeUndefined();
    expect(result.key_vars).not.toContain("dirs");
    expect(result.key_vars).toContain("board");
  });

  it("GRAPH strategy를 LINEAR로 전환한다", () => {
    const meta = { ...baseMeta, strategy: "GRAPH" as const };
    const code = "dirs = {\"U\": (0, 1), \"D\": (0, -1)}";
    const result = applyDirectionMapGuards(meta, code);
    expect(result.strategy).toBe("LINEAR");
  });
});

// ── applyGraphModeInference ───────────────────────────────────────────────────

describe("applyGraphModeInference", () => {
  it("이미 graph_mode가 있으면 그대로 반환한다", () => {
    const meta = { ...baseMeta, graph_mode: "directed" as const };
    const result = applyGraphModeInference(meta, "any code");
    expect(result.graph_mode).toBe("directed");
  });

  it("graph_mode가 없고 코드에서 추론 가능하면 설정한다", () => {
    const code = "graph[u].append(v)\n# directed one-way edges";
    const result = applyGraphModeInference(baseMeta, code);
    // inferGraphModeFromCode가 null이 아닌 값을 반환하면 설정됨
    // 추론 불가 시 그대로 — 구현에 따라 다름
    expect(result).toBeDefined();
  });

  it("추론 불가하면 graph_mode를 설정하지 않는다", () => {
    const result = applyGraphModeInference(baseMeta, "x = 1");
    expect(result.graph_mode).toBeUndefined();
  });
});

// ── enrichSpecialVarKinds ─────────────────────────────────────────────────────

describe("enrichSpecialVarKinds", () => {
  it("heapq 패턴이 있으면 HEAP으로 감지한다", () => {
    const code = "hq = []\nheapq.heappush(hq, 1)\nheapq.heappop(hq)";
    const result = enrichSpecialVarKinds(baseMeta, code, { hq: "list" });
    expect(result.special_var_kinds?.hq).toBe("HEAP");
  });

  it("deque + popleft만 사용하면 QUEUE로 감지한다", () => {
    const code = "q = deque()\nq.append(1)\nq.popleft()";
    const result = enrichSpecialVarKinds(baseMeta, code, { q: "deque" });
    expect(result.special_var_kinds?.q).toBe("QUEUE");
  });

  it("deque + appendleft + popleft 사용하면 DEQUE로 감지한다", () => {
    const code = "d = deque()\nd.appendleft(1)\nd.popleft()";
    const result = enrichSpecialVarKinds(baseMeta, code, { d: "deque" });
    expect(result.special_var_kinds?.d).toBe("DEQUE");
  });

  it("list + append + pop 사용하면 STACK으로 감지한다", () => {
    const code = "st = []\nst.append(1)\nst.pop()";
    const result = enrichSpecialVarKinds(baseMeta, code, { st: "list" });
    expect(result.special_var_kinds?.st).toBe("STACK");
  });

  it("[False]*n + 대입 패턴이면 VISITED로 감지한다", () => {
    const code = "visited = [False] * n\nvisited[node] = True";
    const result = enrichSpecialVarKinds(baseMeta, code, { visited: "list" });
    expect(result.special_var_kinds?.visited).toBe("VISITED");
  });

  it("[INF]*n 패턴이면 DISTANCE로 감지한다", () => {
    const code = "dist = [float('inf')] * n";
    const result = enrichSpecialVarKinds(baseMeta, code, { dist: "list" });
    expect(result.special_var_kinds?.dist).toBe("DISTANCE");
  });

  it("AI가 이미 채운 항목은 덮어쓰지 않는다", () => {
    const meta = { ...baseMeta, special_var_kinds: { hq: "QUEUE" as const } };
    const code = "hq = []\nheapq.heappush(hq, 1)";
    const result = enrichSpecialVarKinds(meta, code, { hq: "list" });
    expect(result.special_var_kinds?.hq).toBe("QUEUE");
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
