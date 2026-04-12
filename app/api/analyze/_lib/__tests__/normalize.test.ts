import { describe, it, expect } from "vitest";
import type { AnalyzeAiResponse } from "@/types/prova";
import {
  normalizeResponse,
  fallbackAnalyzeMetadata,
  parseLinearPivots,
  parseLinearContextVarNames,
} from "../normalize";

const varTypes: Record<string, string> = {
  arr: "list",
  i: "int",
  j: "int",
  visited: "list",
  graph: "list2d",
};
const varNames = Object.keys(varTypes);

const baseResponse: AnalyzeAiResponse = {
  algorithm: "BFS",
  display_name: "너비 우선 탐색",
  strategy: "GRAPH",
  tags: ["bfs", "graph"],
  key_vars: ["graph", "visited"],
  var_mapping_list: [
    { role: "GRAPH", var_name: "graph", panel: "GRAPH" },
    { role: "VISITED", var_name: "visited", panel: "LINEAR" },
  ],
};

// ── normalizeResponse ─────────────────────────────────────────────────────────

describe("normalizeResponse", () => {
  it("유효한 strategy를 그대로 반환한다", () => {
    const result = normalizeResponse(baseResponse, varTypes);
    expect(result.strategy).toBe("GRAPH");
  });

  it("유효하지 않은 strategy는 LINEAR로 기본값을 적용한다", () => {
    const result = normalizeResponse(
      { ...baseResponse, strategy: "INVALID" as "GRID" },
      varTypes,
    );
    expect(result.strategy).toBe("LINEAR");
  });

  it("var_mapping_list를 객체 형태 var_mapping으로 변환한다", () => {
    const result = normalizeResponse(baseResponse, varTypes);
    expect(result.var_mapping.GRAPH).toEqual({ var_name: "graph", panel: "GRAPH" });
    expect(result.var_mapping.VISITED).toEqual({ var_name: "visited", panel: "LINEAR" });
  });

  it("varTypes에 없는 변수는 var_mapping에서 필터링한다", () => {
    const response = {
      ...baseResponse,
      var_mapping_list: [
        { role: "MAIN", var_name: "nonexistent", panel: "LINEAR" as const },
        { role: "ARR", var_name: "arr", panel: "LINEAR" as const },
      ],
    };
    const result = normalizeResponse(response, varTypes);
    expect(result.var_mapping.MAIN).toBeUndefined();
    expect(result.var_mapping.ARR).toBeDefined();
  });

  it("tags에 normalizeAndDedupeTags를 적용한다", () => {
    const result = normalizeResponse(baseResponse, varTypes);
    expect(result.tags.every((t) => /^[a-z0-9가-힣-]+$/.test(t))).toBe(true);
  });

  it("special_var_kinds 화이트리스트 외 값은 무시한다", () => {
    const response = {
      ...baseResponse,
      special_var_kinds: { arr: "INVALID" as "HEAP", visited: "VISITED" as const },
    };
    const result = normalizeResponse(response, varTypes);
    expect(result.special_var_kinds?.arr).toBeUndefined();
    expect(result.special_var_kinds?.visited).toBe("VISITED");
  });

  it("graph_mode는 directed 또는 undirected만 통과한다", () => {
    const directed = normalizeResponse({ ...baseResponse, graph_mode: "directed" }, varTypes);
    expect(directed.graph_mode).toBe("directed");
    const invalid = normalizeResponse({ ...baseResponse, graph_mode: "invalid" as "directed" }, varTypes);
    expect(invalid.graph_mode).toBeUndefined();
  });

  it("빈 응답에 기본값을 채운다", () => {
    const empty: AnalyzeAiResponse = {
      algorithm: "",
      display_name: "",
      strategy: "" as "GRID",
      tags: [],
      key_vars: [],
    };
    const result = normalizeResponse(empty, varTypes);
    expect(result.algorithm).toBe("Unknown");
    expect(result.strategy).toBe("LINEAR");
    expect(result.tags.length).toBeGreaterThan(0);
  });
});

// ── parseLinearPivots ─────────────────────────────────────────────────────────

describe("parseLinearPivots", () => {
  it("정상 배열을 LinearPivotSpec으로 변환한다", () => {
    const raw = [{ var_name: "i", pivot_mode: "index", badge: "i" }];
    const result = parseLinearPivots(raw, varNames);
    expect(result).toHaveLength(1);
    expect(result![0].var_name).toBe("i");
    expect(result![0].pivot_mode).toBe("index");
  });

  it("varTypes에 없는 var_name은 필터링한다", () => {
    const raw = [{ var_name: "nonexistent" }];
    expect(parseLinearPivots(raw, varNames)).toBeUndefined();
  });

  it("유효한 pivot_mode만 통과한다", () => {
    const raw = [{ var_name: "i", pivot_mode: "invalid" }];
    const result = parseLinearPivots(raw, varNames);
    expect(result![0].pivot_mode).toBeUndefined();
  });

  it("비배열이면 undefined를 반환한다", () => {
    expect(parseLinearPivots("not array", varNames)).toBeUndefined();
    expect(parseLinearPivots(null, varNames)).toBeUndefined();
  });
});

// ── parseLinearContextVarNames ────────────────────────────────────────────────

describe("parseLinearContextVarNames", () => {
  it("유효한 변수명만 필터링한다", () => {
    const result = parseLinearContextVarNames(["i", "j", "nonexistent"], varNames);
    expect(result).toEqual(["i", "j"]);
  });

  it("비배열이면 undefined를 반환한다", () => {
    expect(parseLinearContextVarNames("not array", varNames)).toBeUndefined();
  });
});

// ── fallbackAnalyzeMetadata ───────────────────────────────────────────────────

describe("fallbackAnalyzeMetadata", () => {
  it("기본 분석으로 기본-분석 태그를 반환한다", () => {
    const result = fallbackAnalyzeMetadata({ x: "int" });
    expect(result.tags).toContain("기본-분석");
    expect(result.strategy).toBe("LINEAR");
  });

  it("JS + push/pop + DFS 키워드가 있으면 dfs 태그를 반환한다", () => {
    const code = "stack.push(1);\nstack.pop(); // DFS recursion";
    const result = fallbackAnalyzeMetadata({ stack: "list" }, code, "javascript");
    expect(result.tags).toContain("dfs");
    expect(result.detected_data_structures).toContain("stack");
  });

  it("JS + shift + BFS 키워드가 있으면 bfs 태그를 반환한다", () => {
    const code = "queue.shift(); // BFS level order";
    const result = fallbackAnalyzeMetadata({ queue: "list" }, code, "javascript");
    expect(result.tags).toContain("bfs");
    expect(result.detected_data_structures).toContain("queue");
  });
});
