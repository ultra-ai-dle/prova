import { AnalyzeMetadata, AnalyzeAiResponse, LinearPivotSpec, Panel, Strategy } from "@/types/prova";
import { normalizeAndDedupeTags } from "@/lib/tagNormalize";

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function parseLinearPivots(
  raw: unknown,
  varNames: string[],
): LinearPivotSpec[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: LinearPivotSpec[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const vn = typeof o.var_name === "string" ? o.var_name.trim() : "";
    if (!vn || !varNames.includes(vn)) continue;
    const spec: LinearPivotSpec = { var_name: vn };
    if (typeof o.badge === "string") {
      const b = o.badge.trim();
      if (b.length > 0 && b.length <= 6) spec.badge = b;
    }
    const iv =
      typeof o.indexes_1d_var === "string" ? o.indexes_1d_var.trim() : "";
    if (iv && varNames.includes(iv)) spec.indexes_1d_var = iv;
    const pm = o.pivot_mode;
    if (pm === "value_in_array" || pm === "index") spec.pivot_mode = pm;
    out.push(spec);
    if (out.length >= 16) break;
  }
  return out.length > 0 ? out : undefined;
}

export function parseLinearContextVarNames(
  raw: unknown,
  varNames: string[],
): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter(
      (x): x is string => typeof x === "string" && varNames.includes(x.trim()),
    )
    .map((x) => x.trim())
    .slice(0, 16);
  return out.length > 0 ? out : undefined;
}

export function normalizeResponse(
  parsed: AnalyzeAiResponse,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  const validStrategy: Strategy[] = ["GRID", "LINEAR", "GRID_LINEAR", "GRAPH"];
  const strategy = validStrategy.includes(parsed.strategy)
    ? parsed.strategy
    : "LINEAR";

  const varNames = Object.keys(varTypes);
  const validMap: Record<string, { var_name: string; panel: Panel }> = {};
  const panelSet = new Set<Panel>(["GRID", "LINEAR", "GRAPH", "VARIABLES"]);

  // var_mapping_list (배열, Gemini structured output용) → 객체로 변환
  if (Array.isArray(parsed.var_mapping_list)) {
    parsed.var_mapping_list.forEach((item) => {
      if (
        !item ||
        typeof item.role !== "string" ||
        typeof item.var_name !== "string"
      )
        return;
      if (!varNames.includes(item.var_name)) return;
      const panel = panelSet.has(item.panel) ? item.panel : "VARIABLES";
      validMap[item.role] = { var_name: item.var_name, panel };
    });
  }
  // var_mapping (객체, 기존 포맷 및 non-Gemini 프로바이더용) — 폴백
  if (Object.keys(validMap).length === 0) {
    Object.entries(parsed.var_mapping ?? {}).forEach(([role, item]) => {
      if (!item || typeof item.var_name !== "string") return;
      if (!varNames.includes(item.var_name)) return;
      const panel = panelSet.has(item.panel) ? item.panel : "VARIABLES";
      validMap[role] = { var_name: item.var_name, panel };
    });
  }

  const keyVars = (parsed.key_vars ?? [])
    .filter((k) => varNames.includes(k))
    .slice(0, 8);
  const linearPivots = parseLinearPivots(parsed.linear_pivots, varNames);
  const linearContextVarNames = parseLinearContextVarNames(
    parsed.linear_context_var_names,
    varNames,
  );
  const detectedDataStructures = uniq(
    (parsed.detected_data_structures ?? []).map(String),
  ).slice(0, 8);
  const detectedAlgorithms = uniq(
    (parsed.detected_algorithms ?? []).map(String),
  ).slice(0, 8);
  const rawTc =
    typeof parsed.time_complexity === "string"
      ? parsed.time_complexity.trim()
      : "";
  const timeComplexity = rawTc
    ? rawTc.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 96)
    : undefined;

  const tags = normalizeAndDedupeTags(
    [
      ...(parsed.tags ?? []).map(String),
      ...detectedDataStructures,
      ...detectedAlgorithms,
    ],
    10,
  );

  type SpecialKind =
    | "HEAP"
    | "QUEUE"
    | "STACK"
    | "DEQUE"
    | "UNIONFIND"
    | "VISITED"
    | "DISTANCE"
    | "PARENT_TREE";
  const validSpecialKinds = new Set<SpecialKind>([
    "HEAP",
    "QUEUE",
    "STACK",
    "DEQUE",
    "UNIONFIND",
    "VISITED",
    "DISTANCE",
    "PARENT_TREE",
  ]);
  const specialVarKinds: Record<string, SpecialKind> = {};
  if (
    parsed.special_var_kinds &&
    typeof parsed.special_var_kinds === "object"
  ) {
    Object.entries(parsed.special_var_kinds).forEach(([vn, kind]) => {
      if (!varNames.includes(vn)) return;
      if (validSpecialKinds.has(kind as SpecialKind)) {
        specialVarKinds[vn] = kind as SpecialKind;
      }
    });
  }

  return {
    algorithm: parsed.algorithm || "Unknown",
    display_name: parsed.display_name || strategy,
    strategy,
    tags: tags.length > 0 ? tags : ["일반-구현"],
    detected_data_structures: detectedDataStructures,
    detected_algorithms: detectedAlgorithms,
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary.slice(0, 120)
        : undefined,
    graph_mode:
      parsed.graph_mode === "directed"
        ? "directed"
        : parsed.graph_mode === "undirected"
          ? "undirected"
          : undefined,
    graph_var_name:
      typeof parsed.graph_var_name === "string"
        ? parsed.graph_var_name
        : undefined,
    graph_representation:
      parsed.graph_representation === "GRID"
        ? "GRID"
        : parsed.graph_representation === "MAP"
          ? "MAP"
          : undefined,
    uses_bitmasking: !!parsed.uses_bitmasking,
    time_complexity: timeComplexity,
    key_vars: keyVars,
    var_mapping: validMap,
    linear_pivots: linearPivots,
    linear_context_var_names: linearContextVarNames,
    special_var_kinds:
      Object.keys(specialVarKinds).length > 0 ? specialVarKinds : undefined,
  };
}

export function fallbackAnalyzeMetadata(
  varTypes: Record<string, string>,
  code: string = "",
  language: string = "python",
): AnalyzeMetadata {
  const varNames = Object.keys(varTypes);
  const firstLinear =
    varNames.find((k) => /queue|deque|stack|list|arr|path|order/i.test(k)) ??
    varNames[0];

  // JavaScript 배열 패턴 감지 (AI 실패 시에도 기본 분석 제공)
  let tags: string[] = ["기본-분석"];
  let detected_data_structures: string[] = [];
  let detected_algorithms: string[] = [];

  if (language === "javascript" && code) {
    const hasStackOps = /\.push\s*\(|\.pop\s*\(\s*\)/.test(code);
    const hasQueueOps = /\.shift\s*\(\s*\)|\.unshift\s*\(/.test(code);
    const hasDfs = /recursive|dfs|DFS|깊이|Depth|stack/.test(code);
    const hasBfs = /bfs|BFS|queue|너비|breadth|level/.test(code);

    if (hasStackOps && hasDfs) {
      tags = ["dfs"];
      detected_data_structures = ["stack"];
      detected_algorithms = ["dfs"];
    } else if (hasQueueOps && hasBfs) {
      tags = ["bfs"];
      detected_data_structures = ["queue"];
      detected_algorithms = ["bfs"];
    } else if (hasStackOps) {
      tags = ["stack"];
      detected_data_structures = ["stack"];
    } else if (hasQueueOps) {
      tags = ["queue"];
      detected_data_structures = ["queue"];
    }
  }

  const mapping: AnalyzeMetadata["var_mapping"] = {};
  if (firstLinear) {
    mapping.PRIMARY = { var_name: firstLinear, panel: "LINEAR" };
  }
  return {
    algorithm: "Unknown",
    display_name: "기본 분석",
    strategy: "LINEAR",
    tags,
    detected_data_structures,
    detected_algorithms,
    summary:
      tags[0] === "기본-분석"
        ? "AI 과부하로 기본 분석 결과를 표시합니다."
        : "AI 모델 오류로 패턴 인식만 수행했습니다.",
    uses_bitmasking: false,
    key_vars: firstLinear ? [firstLinear] : [],
    var_mapping: mapping,
  };
}
