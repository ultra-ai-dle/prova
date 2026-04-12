import { describe, it, expect } from "vitest";
import { normalizeTagKebab, normalizeAndDedupeTags } from "../tagNormalize";

describe("normalizeTagKebab", () => {
  it("normalizeTagKebab는 공백이 포함된 태그를 kebab-case로 변환한다", () => {
    expect(normalizeTagKebab("Topological Sort")).toBe("topological-sort");
  });

  it("normalizeTagKebab는 선행 # 기호를 제거한다", () => {
    expect(normalizeTagKebab("#bfs")).toBe("bfs");
    expect(normalizeTagKebab("##DFS")).toBe("dfs");
  });

  it("normalizeTagKebab는 언더스코어를 하이픈으로 변환한다", () => {
    expect(normalizeTagKebab("shortest_path")).toBe("shortest-path");
  });

  it("normalizeTagKebab는 연속된 공백과 하이픈을 하나로 축소한다", () => {
    expect(normalizeTagKebab("  two   pointer  ")).toBe("two-pointer");
    expect(normalizeTagKebab("a--b---c")).toBe("a-b-c");
  });

  it("normalizeTagKebab는 빈 문자열일 때 빈 문자열을 반환한다", () => {
    expect(normalizeTagKebab("")).toBe("");
    expect(normalizeTagKebab("   ")).toBe("");
  });
});

describe("normalizeAndDedupeTags", () => {
  it("normalizeAndDedupeTags는 정규화 결과가 같은 태그를 중복 제거한다", () => {
    expect(normalizeAndDedupeTags(["BFS", "bfs", "#bfs"])).toEqual(["bfs"]);
  });

  it("normalizeAndDedupeTags는 첫 등장 순서를 유지한다", () => {
    expect(normalizeAndDedupeTags(["DFS", "bfs", "dfs"])).toEqual([
      "dfs",
      "bfs",
    ]);
  });

  it("normalizeAndDedupeTags는 max 초과 시 잘라낸다", () => {
    const tags = Array.from({ length: 30 }, (_, i) => `tag-${i}`);
    expect(normalizeAndDedupeTags(tags)).toHaveLength(20);
    expect(normalizeAndDedupeTags(tags, 5)).toHaveLength(5);
  });

  it("normalizeAndDedupeTags는 빈 태그를 건너뛴다", () => {
    expect(normalizeAndDedupeTags(["bfs", "", "  ", "dfs"])).toEqual([
      "bfs",
      "dfs",
    ]);
  });
});
