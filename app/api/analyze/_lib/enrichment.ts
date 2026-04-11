import { AnalyzeMetadata, LinearPivotSpec, Panel } from "@/types/prova";
import { inferGraphModeFromCode } from "@/lib/graphModeInference";
import { normalizeAndDedupeTags } from "@/lib/tagNormalize";

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function detectDequeVars(code: string) {
  const vars = new Set<string>();
  const lines = code.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/#.*/, "");
    const m = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*deque\s*\(/);
    if (m) vars.add(m[1]);
  }
  return Array.from(vars);
}

function detectArrayVars(code: string) {
  const vars = new Set<string>();
  const lines = code.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\/\/.*/, "");
    const m = line.match(
      /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\[\]|function\s+[^(]*\([^)]*\)\s*\{[^}]*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\[\]/,
    );
    if (m && m[1]) vars.add(m[1]);
    if (m && m[2]) vars.add(m[2]);

    const pushMatch = line.match(
      /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\.(?:push|unshift|shift|pop)\s*\(/,
    );
    if (pushMatch) vars.add(pushMatch[1]);
  }
  return Array.from(vars);
}

function detectDirectionMapVars(code: string) {
  const vars = new Set<string>();
  const lines = code.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/#.*/, "");
    const mapLike = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{.*\}/);
    if (!mapLike) continue;
    const name = mapLike[1];
    if (!/dir|dirs|direction|delta|move|step/i.test(name)) continue;
    if (/\([ ]*-?\d+[ ]*,[ ]*-?\d+[ ]*\)/.test(line)) {
      vars.add(name);
    }
  }
  return Array.from(vars);
}

export function applyDequeHints(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  const dequeVars = detectDequeVars(code).filter((v) =>
    Object.prototype.hasOwnProperty.call(varTypes, v),
  );
  if (dequeVars.length === 0) return meta;

  const hasQueueOps = /\.popleft\s*\(|\.append\s*\(/.test(code);
  const hasStackOps = /\.pop\s*\(|\.appendleft\s*\(/.test(code);
  const extraTags = [
    "deque",
    hasQueueOps ? "queue" : "",
    hasStackOps ? "stack" : "",
    hasQueueOps ? "BFS" : "",
  ].filter(Boolean);

  const next: AnalyzeMetadata = {
    ...meta,
    tags: normalizeAndDedupeTags([...(meta.tags ?? []), ...extraTags], 10),
    detected_data_structures: uniq([
      ...(meta.detected_data_structures ?? []),
      "deque",
      ...(hasQueueOps ? ["queue"] : []),
      ...(hasStackOps ? ["stack"] : []),
    ]).slice(0, 8),
    key_vars: uniq([...(meta.key_vars ?? []), ...dequeVars]).slice(0, 8),
    var_mapping: { ...meta.var_mapping },
  };

  const panel: Panel = "LINEAR";
  if (!next.var_mapping.QUEUE && hasQueueOps) {
    next.var_mapping.QUEUE = { var_name: dequeVars[0], panel };
  }
  if (!next.var_mapping.STACK && hasStackOps) {
    next.var_mapping.STACK = { var_name: dequeVars[0], panel };
  }
  if (next.strategy === "GRID" && (hasQueueOps || hasStackOps)) {
    next.strategy = "GRID_LINEAR";
  }
  if (next.strategy === "GRAPH" && (hasQueueOps || hasStackOps)) {
    next.strategy = "LINEAR";
  }
  return next;
}

export function applyJsArrayHints(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  const arrayVars = detectArrayVars(code).filter(
    (v) =>
      Object.prototype.hasOwnProperty.call(varTypes, v) &&
      varTypes[v] === "list",
  );
  if (arrayVars.length === 0) return meta;

  const hasStackOps = /\.push\s*\(|\.pop\s*\(\s*\)/.test(code);
  const hasQueueOps = /\.shift\s*\(\s*\)|\.unshift\s*\(/.test(code);
  const hasDfs =
    /recursive|dfs|DFS|递归|깊이|Depth|stack/.test(code) ||
    (hasStackOps && /call|return/.test(code));
  const hasBfs = /bfs|BFS|queue|너비|breadth|lever|level/.test(code);

  if (!hasStackOps && !hasQueueOps) return meta;

  const extraTags = [
    hasStackOps && hasDfs ? "dfs" : "",
    hasStackOps && !hasDfs ? "stack" : "",
    hasQueueOps && hasBfs ? "bfs" : "",
    hasQueueOps && !hasBfs ? "queue" : "",
  ].filter(Boolean);

  const candidateVar = arrayVars[0];
  const next: AnalyzeMetadata = {
    ...meta,
    tags: normalizeAndDedupeTags([...(meta.tags ?? []), ...extraTags], 10),
    detected_data_structures: uniq(
      [
        ...(meta.detected_data_structures ?? []),
        hasStackOps ? "stack" : "",
        hasQueueOps ? "queue" : "",
      ].filter(Boolean),
    ).slice(0, 8),
    detected_algorithms: uniq(
      [
        ...(meta.detected_algorithms ?? []),
        hasDfs ? "dfs" : "",
        hasBfs ? "bfs" : "",
      ].filter(Boolean),
    ).slice(0, 8),
    key_vars: uniq([...(meta.key_vars ?? []), candidateVar]).slice(0, 8),
    var_mapping: { ...meta.var_mapping },
  };

  const panel: Panel = "LINEAR";
  if (!next.var_mapping.STACK && hasStackOps && hasDfs) {
    next.var_mapping.STACK = { var_name: candidateVar, panel };
  }
  if (!next.var_mapping.QUEUE && hasQueueOps && hasBfs) {
    next.var_mapping.QUEUE = { var_name: candidateVar, panel };
  }
  if (next.strategy === "GRID" && (hasStackOps || hasQueueOps)) {
    next.strategy = "GRID_LINEAR";
  }

  return next;
}

export function applyDirectionMapGuards(
  meta: AnalyzeMetadata,
  code: string,
): AnalyzeMetadata {
  const directionVars = detectDirectionMapVars(code);
  if (directionVars.length === 0) return meta;

  const blocked = new Set(directionVars);
  const nextMapping = Object.fromEntries(
    Object.entries(meta.var_mapping ?? {}).filter(
      ([, item]) => !blocked.has(item.var_name),
    ),
  );
  const nextKeyVars = (meta.key_vars ?? []).filter((v) => !blocked.has(v));

  return {
    ...meta,
    var_mapping: nextMapping,
    key_vars: nextKeyVars,
    tags: normalizeAndDedupeTags(
      (meta.tags ?? []).filter(
        (t) => !/graph|grid|격자|그래프|matrix/i.test(t),
      ),
      10,
    ),
    detected_data_structures: uniq(
      (meta.detected_data_structures ?? []).filter(
        (t) => !/graph|grid|matrix|adj/i.test(t),
      ),
    ).slice(0, 8),
    strategy: meta.strategy === "GRAPH" ? "LINEAR" : meta.strategy,
  };
}

export function applyGraphModeInference(
  meta: AnalyzeMetadata,
  code: string,
): AnalyzeMetadata {
  if (meta.graph_mode === "directed" || meta.graph_mode === "undirected")
    return meta;
  const inferred = inferGraphModeFromCode(code);
  if (!inferred) return meta;
  return { ...meta, graph_mode: inferred };
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
 * 코드 패턴 분석으로 special_var_kinds를 보완한다.
 * 변수 '이름'이 아니라 해당 변수에 가해지는 연산(heapq.heappush(v,...), .popleft() 등)으로 판별.
 * AI가 이미 채운 항목은 덮어쓰지 않는다.
 */
export function enrichSpecialVarKinds(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  const varNames = Object.keys(varTypes);
  const existing = meta.special_var_kinds ?? {};
  const extra: Record<string, SpecialKindValue> = {};

  // HEAP: heapq.heappush(var, ...) 또는 heapq.heappop(var) 에 직접 쓰인 변수
  const heapOpRe =
    /heapq\s*\.\s*(?:heappush|heappop|heapreplace|heappushpop)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = heapOpRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v]) extra[v] = "HEAP";
  }

  // QUEUE: deque()로 초기화된 변수 + popleft 사용
  const dequeInitRe =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:collections\.)?deque\s*\(/g;
  while ((m = dequeInitRe.exec(code)) !== null) {
    const v = m[1];
    if (!varNames.includes(v) || existing[v] || extra[v]) continue;
    const hasPopleft = new RegExp(`\\b${v}\\s*\\.\\s*popleft\\s*\\(`).test(
      code,
    );
    const hasAppendleft = new RegExp(
      `\\b${v}\\s*\\.\\s*appendleft\\s*\\(`,
    ).test(code);
    if (hasPopleft && !hasAppendleft) extra[v] = "QUEUE";
    else if (hasPopleft && hasAppendleft) extra[v] = "DEQUE";
    else if (hasAppendleft) extra[v] = "DEQUE";
  }

  // UNIONFIND: parent[x] = parent[parent[x]] 형태 경로 압축 패턴
  const ufAssignRe =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*\[([A-Za-z_][A-Za-z0-9_]*)\]\s*=\s*\1\s*\[\1\s*\[/g;
  while ((m = ufAssignRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v])
      extra[v] = "UNIONFIND";
  }
  // 보조: def find(...) 함수 내에서 쓰인 배열
  const findFuncRe =
    /def\s+find\s*\([^)]*\)[\s\S]*?return\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[/g;
  while ((m = findFuncRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v])
      extra[v] = "UNIONFIND";
  }

  // DISTANCE: 최단거리 배열 — [INF] * n 또는 float('inf')로 초기화
  const distInitRe =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\[(?:INF|float\s*\(\s*['"]inf['"]\s*\)|10\s*\*\s*\*\s*\d+|1e\d+|987654321|999999999)[^\]]*\]\s*\*\s*\w/g;
  while ((m = distInitRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v])
      extra[v] = "DISTANCE";
  }

  // STACK: list로 .append() + .pop() 로 쓰이는 변수 (LIFO)
  // deque로 초기화된 건 이미 위에서 처리됐으므로 list 기반만
  const stackCandidates = new Set<string>();
  const appendRe = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*append\s*\(/g;
  while ((m = appendRe.exec(code)) !== null) {
    const v = m[1];
    if (varNames.includes(v) && !existing[v] && !extra[v])
      stackCandidates.add(v);
  }
  for (const v of stackCandidates) {
    const hasPop = new RegExp(`\\b${v}\\s*\\.\\s*pop\\s*\\(`).test(code);
    const hasPopleft = new RegExp(`\\b${v}\\s*\\.\\s*popleft\\s*\\(`).test(
      code,
    );
    const hasHeapOp = new RegExp(
      `heapq\\s*\\.\\s*(?:heappush|heappop)\\s*\\(\\s*${v}\\b`,
    ).test(code);
    const hasTopAccess = new RegExp(`\\b${v}\\s*\\[\\s*-\\s*1\\s*\\]`).test(
      code,
    );
    if ((hasPop || hasTopAccess) && !hasPopleft && !hasHeapOp)
      extra[v] = "STACK";
  }

  // VISITED: bool/0-1 배열 — [False]*n 또는 [0]*n 으로 초기화되고 visited[node]=True 패턴
  const visitedInitRe =
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\[\s*(?:False|0)\s*\]\s*\*\s*\w/g;
  while ((m = visitedInitRe.exec(code)) !== null) {
    const v = m[1];
    if (!varNames.includes(v) || existing[v] || extra[v]) continue;
    const hasVisitedSet = new RegExp(
      `\\b${v}\\s*\\[\\s*\\w+\\s*\\]\\s*=\\s*(?:True|1)`,
    ).test(code);
    if (hasVisitedSet) extra[v] = "VISITED";
  }

  if (Object.keys(extra).length === 0) return meta;
  return { ...meta, special_var_kinds: { ...existing, ...extra } };
}

/**
 * 코드 패턴으로 linear_pivots를 보완한다.
 * AI가 이미 linear_pivots를 반환했으면 건드리지 않는다.
 * 투포인터·슬라이딩윈도우 패턴: arrVar[intVar] 형태로 쓰이는 정수 변수 2개 이상 → index 피벗.
 */
export function enrichLinearPivots(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  if (meta.linear_pivots && meta.linear_pivots.length > 0) return meta;

  const intVars = Object.entries(varTypes)
    .filter(([, t]) => t === "int")
    .map(([k]) => k);
  const listVars = Object.entries(varTypes)
    .filter(([, t]) => t === "list")
    .map(([k]) => k);

  if (intVars.length < 2 || listVars.length === 0) return meta;

  for (const arrVar of listVars) {
    const indexedVars: string[] = [];
    for (const intVar of intVars) {
      const usedAsIndex = new RegExp(
        `\\b${arrVar}\\s*\\[\\s*${intVar}\\s*\\]`,
      ).test(code);
      if (!usedAsIndex) continue;
      const changes = new RegExp(`\\b${intVar}\\s*[+\\-]?=`).test(code);
      if (changes) indexedVars.push(intVar);
    }
    if (indexedVars.length >= 2) {
      const pivots: LinearPivotSpec[] = indexedVars.map((v) => ({
        var_name: v,
        pivot_mode: "index" as const,
        indexes_1d_var: listVars.length > 1 ? arrVar : undefined,
        badge: v.slice(0, 2),
      }));
      return { ...meta, linear_pivots: pivots };
    }
  }
  return meta;
}
