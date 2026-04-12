interface JavaPatternResult {
  tags: string[];
  detected_data_structures: string[];
  detected_algorithms: string[];
}

/**
 * Java 코드에서 알고리즘/자료구조 패턴을 감지한다.
 *
 * 규칙: 변수명·메서드명에 의존하지 않고 타입 사용 패턴과 연산 패턴만으로 판별한다.
 * - 허용: 타입명(Stack<, Queue<, …) + 연산(.push/.pop, .offer/.poll, …)
 * - 금지: 변수명/메서드명(dfs, bfs, dp, lo, hi, mid …) 기반 감지
 */
export function detectJavaPatterns(code: string): JavaPatternResult | null {
  // ── 연산 패턴 ─────────────────────────────────────────────────────────────
  const hasStackOps = /\.push\s*\(|\.pop\s*\(\s*\)/.test(code);
  const hasQueueOps = /\.offer\s*\(|\.poll\s*\(\s*\)/.test(code);

  // ── 타입 사용 패턴 (varTypes 직렬화 힌트 — 허용) ──────────────────────────
  const hasStackType = /Stack\s*</.test(code);
  const hasQueueType = /(?:Queue|Deque)\s*</.test(code);
  const hasHeap      = /PriorityQueue\s*</.test(code);

  // ── 자료구조 사용 패턴 ────────────────────────────────────────────────────
  // 인접 리스트: Map<Integer, List/ArrayList<…>> 타입 선언 또는 .get(v).add(u) 패턴
  const hasAdjMap  = /Map\s*<\s*Integer\s*,\s*(?:List|ArrayList)\s*</.test(code);
  const hasAdjGet  = /\.get\s*\(\s*\w+\s*\)\s*\.add\s*\(/.test(code);

  // ── 알고리즘 연산 패턴 ────────────────────────────────────────────────────
  // DP: 이전 인덱스 참조 갱신 패턴 — arr[i] = f(arr[i-1], …) 또는 arr[i][j] = f(arr[i-1][j], …)
  const hasRecurrence = /\[\s*\w+\s*-\s*\d+\s*\]/.test(code);

  // 정렬: 라이브러리 호출 패턴
  const hasSort = /Arrays\.sort|Collections\.sort/.test(code);
  // 비교 정렬(버블·삽입·선택 등): 서로 다른 첨자로 같은 배열(또는 두 배열) 원소를 > / < 로 비교
  // (예: arr[j] > arr[j + 1]) — 변수명·알고리즘 이름에 의존하지 않음
  const hasElementCompareOrder =
    /[\w.]+\[[^\]]+\]\s*[><]\s*[\w.]+\[[^\]]+\]/.test(code);

  // 이분 탐색: 반복문 + 절반 분할 패턴 (÷2 또는 >>1)
  const hasBinarySearch =
    /while\s*\(/.test(code) && /\/\s*2\b|>>\s*1\b/.test(code);

  // ── 분류 ─────────────────────────────────────────────────────────────────
  const tags: string[] = [];
  const structures: string[] = [];
  const algorithms: string[] = [];

  if (hasStackType || hasStackOps) {
    tags.push("dfs"); structures.push("stack"); algorithms.push("dfs");
  }
  if (hasQueueType || hasQueueOps) {
    tags.push("bfs"); structures.push("queue"); algorithms.push("bfs");
  }
  if (hasHeap) {
    structures.push("heap");
  }
  if (hasAdjMap || hasAdjGet) {
    tags.push("graph"); structures.push("graph");
  }
  if (hasRecurrence) {
    tags.push("dp"); algorithms.push("dynamic_programming");
  }
  if (hasSort || hasElementCompareOrder) {
    tags.push("sort");
    algorithms.push("sort");
  }
  if (hasBinarySearch) {
    tags.push("binary-search"); algorithms.push("binary_search");
  }

  if (tags.length === 0 && structures.length === 0) return null;

  return {
    tags:                     [...new Set(tags)],
    detected_data_structures: [...new Set(structures)],
    detected_algorithms:      [...new Set(algorithms)],
  };
}
