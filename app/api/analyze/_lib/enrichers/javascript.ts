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
 * JS 전용 enricher.
 * 역할 판별은 **변수별 연산 패턴(usage)**으로만 한다.
 * hasDfs / hasBfs / 코드 키워드 검색 **사용 금지** (prova-ai-linear-visualization.mdc 준수).
 *
 * 역할 결정 규칙 (per variable):
 *   push+pop (shift/unshift 없음) → STACK
 *   push+shift 또는 unshift+pop  → QUEUE
 *   push+pop AND unshift+shift    → DEQUE
 */
export function applyJsEnricher(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  // 코드에서 [] 초기화 또는 push/pop/shift/unshift 연산이 관찰된 array 변수 후보 수집
  const arrayVarSet = new Set<string>();
  const lines = code.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\/\/.*/, "");

    // const/let/var v = [] 선언
    const declMatch = line.match(
      /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\[/,
    );
    if (declMatch) arrayVarSet.add(declMatch[1]);

    // 배열 메서드 호출 (변수 후보 추가)
    const opMatch = line.match(
      /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\.(?:push|pop|shift|unshift)\s*\(/,
    );
    if (opMatch) arrayVarSet.add(opMatch[1]);
  }

  // varTypes에 존재하는 list 타입 변수만 처리
  const arrayVars = Array.from(arrayVarSet).filter(
    (v) =>
      Object.prototype.hasOwnProperty.call(varTypes, v) &&
      varTypes[v] === "list",
  );

  if (arrayVars.length === 0) return meta;

  const existing = meta.special_var_kinds ?? {};
  const extra: Record<string, SpecialKindValue> = {};

  for (const v of arrayVars) {
    if (existing[v]) continue; // AI가 이미 설정한 값은 유지

    const hasPush    = new RegExp(`\\b${v}\\.push\\s*\\(`).test(code);
    const hasPop     = new RegExp(`\\b${v}\\.pop\\s*\\(\\s*\\)`).test(code);
    const hasShift   = new RegExp(`\\b${v}\\.shift\\s*\\(\\s*\\)`).test(code);
    const hasUnshift = new RegExp(`\\b${v}\\.unshift\\s*\\(`).test(code);

    const stackOps = hasPush && hasPop;
    const queueOps = hasShift || hasUnshift;

    if (stackOps && queueOps) {
      extra[v] = "DEQUE";
    } else if (hasPush && hasShift) {
      extra[v] = "QUEUE";    // enqueue via push, dequeue via shift (FIFO)
    } else if (hasUnshift && hasPop) {
      extra[v] = "QUEUE";    // enqueue via unshift, dequeue via pop (FIFO reversed)
    } else if (stackOps) {
      extra[v] = "STACK";
    } else if (queueOps) {
      extra[v] = "QUEUE";
    }
  }

  if (Object.keys(extra).length === 0) return meta;

  const candidateVar = arrayVars[0];
  const allKinds = { ...existing, ...extra };

  // var_mapping 보완 (STACK / QUEUE / DEQUE 중 아직 없는 것만)
  const nextMapping = { ...meta.var_mapping };
  const panel: Panel = "LINEAR";

  for (const [v, kind] of Object.entries(extra)) {
    if (kind === "STACK" && !nextMapping.STACK)
      nextMapping.STACK = { var_name: v, panel };
    if (kind === "QUEUE" && !nextMapping.QUEUE)
      nextMapping.QUEUE = { var_name: v, panel };
    if (kind === "DEQUE" && !nextMapping.DEQUE)
      nextMapping.DEQUE = { var_name: v, panel };
  }

  const hasStackKind = Object.values(extra).includes("STACK");
  const hasQueueKind = Object.values(extra).includes("QUEUE");
  const hasDequeKind = Object.values(extra).includes("DEQUE");

  const extraTags = [
    hasStackKind ? "stack" : "",
    hasQueueKind ? "queue" : "",
    hasDequeKind ? "deque" : "",
  ].filter(Boolean);

  const next: AnalyzeMetadata = {
    ...meta,
    special_var_kinds: allKinds,
    var_mapping: nextMapping,
    tags: normalizeAndDedupeTags([...(meta.tags ?? []), ...extraTags], 10),
    detected_data_structures: uniq([
      ...(meta.detected_data_structures ?? []),
      hasStackKind ? "stack" : "",
      hasQueueKind ? "queue" : "",
      hasDequeKind ? "deque" : "",
    ].filter(Boolean)).slice(0, 8),
    key_vars: uniq([...(meta.key_vars ?? []), candidateVar]).slice(0, 8),
  };

  if (next.strategy === "GRID" && (hasStackKind || hasQueueKind || hasDequeKind)) {
    next.strategy = "GRID_LINEAR";
  }

  return next;
}
