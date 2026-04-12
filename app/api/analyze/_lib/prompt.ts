export const ANALYZE_CODE_CHAR_LIMIT = 5000;
export const ANALYZE_VAR_TYPES_LIMIT = 40;

export function compactCodeForAnalyze(code: string) {
  const compactLimit = 3200;
  if (code.length <= compactLimit) return code;
  const head = code.slice(0, Math.floor(compactLimit * 0.8));
  const tail = code.slice(-Math.floor(compactLimit * 0.2));
  return `${head}\n# ... truncated for token optimization ...\n${tail}`;
}

export function compactVarTypes(varTypes: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(varTypes).slice(0, ANALYZE_VAR_TYPES_LIMIT),
  );
}

// Gemini responseSchema for analyze (structured output reduces parse failures)
export const ANALYZE_GEMINI_SCHEMA: object = {
  type: "object",
  properties: {
    // 시각화 핵심 필드를 앞에 배치 — 토큰 부족 시에도 우선 생성되도록
    algorithm: { type: "string" },
    display_name: { type: "string" },
    strategy: { type: "string" },
    key_vars: { type: "array", items: { type: "string" } },
    var_mapping_list: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          var_name: { type: "string" },
          panel: {
            type: "string",
            enum: ["GRID", "LINEAR", "GRAPH", "VARIABLES"],
          },
        },
        required: ["role", "var_name", "panel"],
      },
    },
    // 보조 필드
    tags: { type: "array", items: { type: "string" } },
    detected_data_structures: { type: "array", items: { type: "string" } },
    detected_algorithms: { type: "array", items: { type: "string" } },
    graph_mode: { type: "string" },
    graph_var_name: { type: "string" },
    graph_representation: { type: "string" },
    uses_bitmasking: { type: "boolean" },
    time_complexity: { type: "string" },
    linear_pivots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          var_name: { type: "string" },
          badge: { type: "string" },
          indexes_1d_var: { type: "string" },
          pivot_mode: { type: "string", enum: ["index", "value_in_array"] },
        },
        required: ["var_name"],
      },
    },
    linear_context_var_names: { type: "array", items: { type: "string" } },
    special_var_kinds: { type: "object" },
    // summary는 자유형 문자열이라 길어질 수 있으므로 마지막에 배치
    summary: { type: "string", maxLength: 120 },
  },
  required: [
    "algorithm",
    "display_name",
    "strategy",
    "key_vars",
    "var_mapping_list",
    "tags",
  ],
};
