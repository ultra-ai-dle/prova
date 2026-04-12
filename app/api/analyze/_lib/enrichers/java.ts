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
 * Java 전용 enricher.
 * 역할 판별은 **소스코드 타입 선언 + 연산 패턴(usage)**으로만 한다.
 * 변수명/키워드 기반 단언 금지 (prova-ai-linear-visualization.mdc 준수).
 *
 * 타입 선언 → 후보 변수 식별:
 *   ArrayDeque/Deque/LinkedList<> v = ... → deque 후보
 *   PriorityQueue<> v = ...              → heap 후보
 *   Stack<> v = ...                      → stack 후보
 *   boolean[] v = ...                    → visited 후보
 *   int[] v = ...                        → distance 후보
 *
 * 연산 패턴 → 역할 확정:
 *   addFirst+addLast+(removeFirst|removeLast) → DEQUE
 *   offer/add + poll/remove (단방향)          → QUEUE
 *   push + pop                               → STACK
 *   PriorityQueue + offer/add + poll         → HEAP
 *   boolean[] + v[i] = true                 → VISITED
 *   int[] + Arrays.fill(v,...) + v[i]=       → DISTANCE
 */
export function applyJavaEnricher(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  const varNames = Object.keys(varTypes);
  const existing = meta.special_var_kinds ?? {};
  const extra: Record<string, SpecialKindValue> = {};

  // ── 1. ArrayDeque / Deque / LinkedList 선언 감지 ─────────────────────────
  const dequeTypeRe =
    /(?:ArrayDeque|Deque|LinkedList)\s*<[^>]*>\s+(\w+)\s*=/g;
  let m: RegExpExecArray | null;
  const dequeVars: string[] = [];
  while ((m = dequeTypeRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v)) dequeVars.push(v);
  }

  for (const v of dequeVars) {
    if (existing[v] || extra[v]) continue;

    const hasAddFirst    = new RegExp(`\\b${v}\\s*\\.\\s*addFirst\\s*\\(`).test(code);
    const hasAddLast     = new RegExp(`\\b${v}\\s*\\.\\s*addLast\\s*\\(`).test(code);
    const hasRemoveFirst = new RegExp(`\\b${v}\\s*\\.\\s*(?:removeFirst|pollFirst)\\s*\\(`).test(code);
    const hasRemoveLast  = new RegExp(`\\b${v}\\s*\\.\\s*(?:removeLast|pollLast)\\s*\\(`).test(code);
    const hasOffer       = new RegExp(`\\b${v}\\s*\\.\\s*(?:offer|add)\\s*\\(`).test(code);
    const hasPoll        = new RegExp(`\\b${v}\\s*\\.\\s*(?:poll|remove)\\s*\\(`).test(code);
    const hasPush        = new RegExp(`\\b${v}\\s*\\.\\s*push\\s*\\(`).test(code);
    const hasPop         = new RegExp(`\\b${v}\\s*\\.\\s*pop\\s*\\(`).test(code);

    if ((hasAddFirst || hasRemoveLast) && (hasAddLast || hasRemoveFirst)) {
      // 양방향 접근 → DEQUE
      extra[v] = "DEQUE";
    } else if (hasPush && hasPop) {
      // LIFO → STACK
      extra[v] = "STACK";
    } else if (hasOffer && hasPoll) {
      // FIFO → QUEUE
      extra[v] = "QUEUE";
    } else if (hasAddFirst || hasAddLast || hasRemoveFirst || hasRemoveLast) {
      // 방향성 불분명하지만 deque 연산 사용 → DEQUE
      extra[v] = "DEQUE";
    }
  }

  // ── 2. PriorityQueue 선언 감지 → HEAP ────────────────────────────────────
  const heapTypeRe = /PriorityQueue\s*<[^>]*>\s+(\w+)\s*=/g;
  while ((m = heapTypeRe.exec(code)) !== null) {
    const v = m[1];
    if (!varNames.includes(v) || existing[v] || extra[v]) continue;
    const hasOffer = new RegExp(`\\b${v}\\s*\\.\\s*(?:offer|add)\\s*\\(`).test(code);
    const hasPoll  = new RegExp(`\\b${v}\\s*\\.\\s*(?:poll|remove)\\s*\\(`).test(code);
    if (hasOffer || hasPoll) extra[v] = "HEAP";
  }

  // ── 3. Stack 선언 감지 → STACK ───────────────────────────────────────────
  const stackTypeRe = /Stack\s*<[^>]*>\s+(\w+)\s*=/g;
  while ((m = stackTypeRe.exec(code)) !== null) {
    const v = m[1];
    if (!varNames.includes(v) || existing[v] || extra[v]) continue;
    const hasPush = new RegExp(`\\b${v}\\s*\\.\\s*push\\s*\\(`).test(code);
    const hasPop  = new RegExp(`\\b${v}\\s*\\.\\s*pop\\s*\\(`).test(code);
    if (hasPush || hasPop) extra[v] = "STACK";
  }

  if (Object.keys(extra).length === 0) return meta;

  const allKinds = { ...existing, ...extra };

  // var_mapping 보완 (아직 매핑 없는 역할만)
  const nextMapping = { ...meta.var_mapping };
  const panel: Panel = "LINEAR";

  for (const [v, kind] of Object.entries(extra)) {
    if (kind === "STACK" && !nextMapping.STACK)
      nextMapping.STACK = { var_name: v, panel };
    if (kind === "QUEUE" && !nextMapping.QUEUE)
      nextMapping.QUEUE = { var_name: v, panel };
    if (kind === "DEQUE" && !nextMapping.DEQUE)
      nextMapping.DEQUE = { var_name: v, panel };
    if (kind === "HEAP" && !nextMapping.HEAP)
      nextMapping.HEAP = { var_name: v, panel };
  }

  const hasStackKind = Object.values(extra).includes("STACK");
  const hasQueueKind = Object.values(extra).includes("QUEUE");
  const hasDequeKind = Object.values(extra).includes("DEQUE");
  const hasHeapKind  = Object.values(extra).includes("HEAP");

  const extraTags = [
    hasStackKind ? "stack" : "",
    hasQueueKind ? "queue" : "",
    hasDequeKind ? "deque" : "",
    hasHeapKind  ? "heap"  : "",
  ].filter(Boolean);

  const next: AnalyzeMetadata = {
    ...meta,
    special_var_kinds: allKinds,
    var_mapping: nextMapping,
    tags: normalizeAndDedupeTags([...(meta.tags ?? []), ...extraTags], 10),
    detected_data_structures: uniq([
      ...(meta.detected_data_structures ?? []),
      ...extraTags,
    ]).slice(0, 8),
    key_vars: uniq([
      ...(meta.key_vars ?? []),
      ...Object.keys(extra),
    ]).slice(0, 8),
  };

  if (
    next.strategy === "GRID" &&
    (hasStackKind || hasQueueKind || hasDequeKind)
  ) {
    next.strategy = "GRID_LINEAR";
  }

  return next;
}
