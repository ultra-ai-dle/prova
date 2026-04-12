import { AnalyzeMetadata, Panel } from "@/types/prova";
import { normalizeAndDedupeTags } from "@/lib/tagNormalize";

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

type SpecialKindValue =
  | "HEAP"
  | "QUEUE"
  | "STACK"
  | "DEQUE"
  | "UNIONFIND"
  | "VISITED"
  | "DISTANCE"
  | "PARENT_TREE";

/**
 * Python 전용 enricher.
 * 역할 판별은 연산 패턴(usage)으로만 한다 — 변수명/키워드 기반 단언 금지.
 *
 * 포함 내용:
 * - 구 applyDequeHints: deque() 초기화 변수 감지 + var_mapping 보완
 * - 구 enrichSpecialVarKinds (Python 패턴 전체):
 *   HEAP / QUEUE / DEQUE / STACK / VISITED / DISTANCE / UNIONFIND
 */
export function applyPythonEnricher(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  const varNames = Object.keys(varTypes);
  const existing = meta.special_var_kinds ?? {};
  const extra: Record<string, SpecialKindValue> = {};

  // ── HEAP: heapq.heappush(v, ...) / heapq.heappop(v) ──────────────────────
  const heapOpRe =
    /heapq\s*\.\s*(?:heappush|heappop|heapreplace|heappushpop)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = heapOpRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v]) extra[v] = "HEAP";
  }

  // ── QUEUE / DEQUE: deque() 초기화 변수 + popleft / appendleft 연산 ────────
  const dequeVars: string[] = [];
  const dequeInitRe =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:collections\.)?deque\s*\(/g;
  while ((m = dequeInitRe.exec(code)) !== null) {
    const v = m[1];
    if (!varNames.includes(v)) continue;
    dequeVars.push(v);
    if (existing[v] || extra[v]) continue;
    const hasPopleft = new RegExp(`\\b${v}\\s*\\.\\s*popleft\\s*\\(`).test(code);
    const hasAppendleft = new RegExp(`\\b${v}\\s*\\.\\s*appendleft\\s*\\(`).test(code);
    if (hasPopleft && hasAppendleft) extra[v] = "DEQUE";
    else if (hasAppendleft) extra[v] = "DEQUE";
    else if (hasPopleft) extra[v] = "QUEUE";
  }

  // ── STACK: list 기반 .append() + .pop() (heapq·popleft 없음) ─────────────
  const appendRe = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*append\s*\(/g;
  const stackCandidates = new Set<string>();
  while ((m = appendRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v])
      stackCandidates.add(v);
  }
  for (const v of stackCandidates) {
    const hasPop = new RegExp(`\\b${v}\\s*\\.\\s*pop\\s*\\(`).test(code);
    const hasPopleft = new RegExp(`\\b${v}\\s*\\.\\s*popleft\\s*\\(`).test(code);
    const hasHeapOp = new RegExp(
      `heapq\\s*\\.\\s*(?:heappush|heappop)\\s*\\(\\s*${v}\\b`,
    ).test(code);
    const hasTopAccess = new RegExp(`\\b${v}\\s*\\[\\s*-\\s*1\\s*\\]`).test(code);
    if ((hasPop || hasTopAccess) && !hasPopleft && !hasHeapOp)
      extra[v] = "STACK";
  }

  // ── UNIONFIND: parent[x] = parent[parent[x]] 경로 압축 패턴 ──────────────
  // 초기화·이름이 아닌 경로 압축 대입 구조 자체가 Union-Find를 직접 규정한다.
  const ufAssignRe =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*\[([A-Za-z_][A-Za-z0-9_]*)\]\s*=\s*\1\s*\[\1\s*\[/g;
  while ((m = ufAssignRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v]) extra[v] = "UNIONFIND";
  }

  // ── var_mapping / tags / detected_data_structures 보완 (구 applyDequeHints) ─
  const knownDequeVars = dequeVars.filter((v) => varNames.includes(v));
  let next: AnalyzeMetadata = {
    ...meta,
    special_var_kinds:
      Object.keys(extra).length > 0 ? { ...existing, ...extra } : existing,
  };

  if (knownDequeVars.length > 0) {
    const hasQueueOps = knownDequeVars.some((v) =>
      new RegExp(`\\b${v}\\s*\\.\\s*popleft\\s*\\(`).test(code),
    );
    const hasStackOps = knownDequeVars.some((v) =>
      new RegExp(`\\b${v}\\s*\\.\\s*(?:pop|appendleft)\\s*\\(`).test(code),
    );
    const extraTags = [
      "deque",
      hasQueueOps ? "queue" : "",
      hasStackOps ? "stack" : "",
    ].filter(Boolean);

    next = {
      ...next,
      tags: normalizeAndDedupeTags([...(meta.tags ?? []), ...extraTags], 10),
      detected_data_structures: uniq([
        ...(meta.detected_data_structures ?? []),
        "deque",
        ...(hasQueueOps ? ["queue"] : []),
        ...(hasStackOps ? ["stack"] : []),
      ]).slice(0, 8),
      key_vars: uniq([...(meta.key_vars ?? []), ...knownDequeVars]).slice(0, 8),
      var_mapping: { ...meta.var_mapping },
    };

    const panel: Panel = "LINEAR";
    if (!next.var_mapping.QUEUE && hasQueueOps) {
      next.var_mapping.QUEUE = { var_name: knownDequeVars[0], panel };
    }
    if (!next.var_mapping.STACK && hasStackOps) {
      next.var_mapping.STACK = { var_name: knownDequeVars[0], panel };
    }
    if (next.strategy === "GRID" && (hasQueueOps || hasStackOps)) {
      next.strategy = "GRID_LINEAR";
    }
    if (next.strategy === "GRAPH" && (hasQueueOps || hasStackOps)) {
      next.strategy = "LINEAR";
    }
  }

  return next;
}
