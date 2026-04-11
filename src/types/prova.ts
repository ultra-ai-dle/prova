export type PyodideStatus =
  | "loading"
  | "ready"
  | "running"
  | "reinitializing"
  | "error";

export type TraceErrorType = "TIMEOUT" | "NETWORK" | "RUNTIME";

export interface TraceError {
  type: TraceErrorType;
  message: string;
}

export interface ScopeInfo {
  func: string;
  depth: number;
}

export interface ParentFrame {
  scope: ScopeInfo;
  vars: Record<string, unknown>;
}

export interface RuntimeErrorInfo {
  type: string;
  message: string;
  line: number;
}

export interface RawTraceStep {
  step: number;
  line: number;
  vars: Record<string, unknown>;
  scope: ScopeInfo;
  parent_frames: ParentFrame[];
  stdout?: string[];
  runtimeError: RuntimeErrorInfo | null;
  /** callsite: called from parent; return: function is returning */
  event?: "callsite" | "return";
  /** return event에만 존재 — 반환값 */
  returnValue?: unknown;
}

export interface AiErrorInfo {
  root_cause: string;
  fix_hint: string;
}

export interface AnnotatedStep {
  explanation: string;
  visual_actions: string[];
  aiError: AiErrorInfo | null;
}

export interface MergedTraceStep extends RawTraceStep, AnnotatedStep {}

export interface BranchLines {
  loop: number[];
  branch: number[];
}

/**
 * AI가 코드 맥락에서 판별한 선형 1D 하이라이트.
 * var_name은 반드시 런타임 varTypes에 존재하는 변수명이어야 한다.
 */
export interface LinearPivotSpec {
  var_name: string;
  /** 셀 아래 배지 (미주면 var_name 기반 자동) */
  badge?: string;
  /** 이 항목이 가리키는 1차원 배열 변수명. 여러 1D 배열이 있을 때 필수에 가깝다. */
  indexes_1d_var?: string;
  /**
   * index(기본): var 값이 정수 인덱스(첨자).
   * value_in_array: var 값이 원소 값 → indexes_1d_var 배열에서 그 값과 같은 첫 칸에 표시(퀵소트 피벗 등). 이름이 pivot인지와 무관하게 맥락으로만 채운다.
   */
  pivot_mode?: "index" | "value_in_array";
}

export interface AnalyzeMetadata {
  algorithm: string;
  display_name: string;
  strategy: "GRID" | "LINEAR" | "GRID_LINEAR" | "GRAPH";
  tags: string[];
  detected_data_structures?: string[];
  detected_algorithms?: string[];
  summary?: string;
  graph_mode?: "directed" | "undirected";
  graph_var_name?: string;
  graph_representation?: "GRID" | "MAP";
  uses_bitmasking?: boolean;
  /** AI 추정 최악 시간 복잡도 (예: O(V+E), O(n log n)) */
  time_complexity?: string;
  key_vars: string[];
  var_mapping: Record<string, { var_name: string; panel: "GRID" | "LINEAR" | "GRAPH" | "VARIABLES" }>;
  /** 선형 시각화: 인덱스 역할을 하는 변수들 (이름 고정 매핑 금지 — 전부 AI가 채움) */
  linear_pivots?: LinearPivotSpec[];
  /** 상단 요약 줄에 표시할 스칼라 변수명 (예: sum_v, total) */
  linear_context_var_names?: string[];
  /** AI가 판단한 변수별 특수 자료구조 시각화 종류 (변수명 → 뷰 종류) */
  special_var_kinds?: Record<string, "HEAP" | "QUEUE" | "STACK" | "DEQUE" | "UNIONFIND" | "VISITED" | "DISTANCE" | "PARENT_TREE">;
}

export interface WorkerDonePayload {
  rawTrace: RawTraceStep[];
  branchLines: BranchLines;
  varTypes: Record<string, string>;
}

export interface PlaybackState {
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
}

/** 시각화 패널 종류 */
export type Panel = "GRID" | "LINEAR" | "GRAPH" | "VARIABLES";
/** AI가 결정하는 시각화 전략 */
export type Strategy = "GRID" | "LINEAR" | "GRID_LINEAR" | "GRAPH";

/** /api/analyze AI 응답 원본 스키마 — normalizeResponse()로 AnalyzeMetadata로 변환 */
export type AnalyzeAiResponse = {
  algorithm: string;
  display_name: string;
  strategy: Strategy;
  tags: string[];
  detected_data_structures?: string[];
  detected_algorithms?: string[];
  summary?: string;
  graph_mode?: "directed" | "undirected";
  graph_var_name?: string;
  graph_representation?: "GRID" | "MAP";
  uses_bitmasking?: boolean;
  time_complexity?: string;
  key_vars: string[];
  var_mapping?: Record<string, { var_name: string; panel: Panel }>;
  var_mapping_list?: Array<{ role: string; var_name: string; panel: Panel }>;
  linear_pivots?: Array<{
    var_name: string;
    badge?: string;
    indexes_1d_var?: string;
    pivot_mode?: "index" | "value_in_array";
  }>;
  linear_context_var_names?: string[];
  /** 변수명 → 특수 자료구조 뷰 종류 — 코드 맥락으로만 판별, 이름 무관 */
  special_var_kinds?: Record<
    string,
    | "HEAP"
    | "QUEUE"
    | "STACK"
    | "DEQUE"
    | "UNIONFIND"
    | "VISITED"
    | "DISTANCE"
    | "PARENT_TREE"
  >;
};
