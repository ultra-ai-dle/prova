// ---------------------------------------------------------------------------
// 예제 갤러리 데이터
// ---------------------------------------------------------------------------

export type ExampleCategory =
  | "sorting"
  | "search"
  | "data-structure"
  | "graph"
  | "dp"
  | "recursion";

export interface CategoryMeta {
  key: ExampleCategory;
  label: string;
  labelEn: string;
}

export interface ExampleItem {
  id: string;
  title: string;
  titleKo: string;
  category: ExampleCategory;
  tags: string[];
  difficulty: "easy" | "medium";
  language: "python" | "javascript";
  code: string;
  stdin: string;
  featured: boolean;
}

// ---------------------------------------------------------------------------
// 카테고리 메타
// ---------------------------------------------------------------------------

export const CATEGORIES: CategoryMeta[] = [
  { key: "sorting", label: "정렬", labelEn: "Sorting" },
  { key: "search", label: "탐색", labelEn: "Search" },
  { key: "data-structure", label: "자료구조", labelEn: "Data Structure" },
  { key: "graph", label: "그래프", labelEn: "Graph" },
  { key: "dp", label: "DP", labelEn: "Dynamic Programming" },
  { key: "recursion", label: "재귀", labelEn: "Recursion" },
];

// ---------------------------------------------------------------------------
// 예제 데이터
// ---------------------------------------------------------------------------

export const EXAMPLES: ExampleItem[] = [
  // ── Sorting ──────────────────────────────────────────────────────────────
  {
    id: "bubble-sort",
    title: "Bubble Sort",
    titleKo: "버블 정렬",
    category: "sorting",
    tags: ["sorting", "array"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "6\n5 3 8 1 4 2",
    code: `import sys
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

for i in range(n):
  for j in range(n - 1 - i):
    if arr[j] > arr[j + 1]:
      arr[j], arr[j + 1] = arr[j + 1], arr[j]

print(*arr)`,
  },
  {
    id: "selection-sort",
    title: "Selection Sort",
    titleKo: "선택 정렬",
    category: "sorting",
    tags: ["sorting", "array"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "6\n5 3 8 1 4 2",
    code: `import sys
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

for i in range(n):
  min_idx = i
  for j in range(i + 1, n):
    if arr[j] < arr[min_idx]:
      min_idx = j
  arr[i], arr[min_idx] = arr[min_idx], arr[i]

print(*arr)`,
  },
  {
    id: "insertion-sort",
    title: "Insertion Sort",
    titleKo: "삽입 정렬",
    category: "sorting",
    tags: ["sorting", "array"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "6\n5 3 8 1 4 2",
    code: `import sys
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

for i in range(1, n):
  key = arr[i]
  j = i - 1
  while j >= 0 and arr[j] > key:
    arr[j + 1] = arr[j]
    j -= 1
  arr[j + 1] = key

print(*arr)`,
  },

  // ── Search ───────────────────────────────────────────────────────────────
  {
    id: "binary-search",
    title: "Binary Search",
    titleKo: "이진 탐색",
    category: "search",
    tags: ["search", "array"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "6\n1 3 5 7 9 11\n6",
    code: `import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  x = int(input())
  lo, hi = 0, n
  while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < x:
      lo = mid + 1
    else:
      hi = mid
  print(lo)

if __name__ == "__main__":
  main()`,
  },
  {
    id: "two-pointers",
    title: "Two Pointers",
    titleKo: "투 포인터",
    category: "search",
    tags: ["search", "array"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "6\n1 2 4 5 7 11\n13",
    code: `import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  t = int(input())
  i, j = 0, n - 1
  while i < j:
    s = a[i] + a[j]
    if s == t:
      print(a[i], a[j])
      return
    if s < t:
      i += 1
    else:
      j -= 1
  print(-1)

if __name__ == "__main__":
  main()`,
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    titleKo: "슬라이딩 윈도우",
    category: "search",
    tags: ["search", "array"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "4 2\n3 1 5 2",
    code: `import sys

input = sys.stdin.readline

def main():
  n, k = map(int, input().split())
  a = list(map(int, input().split()))
  cur = sum(a[:k])
  best = cur
  for i in range(k, n):
    cur += a[i] - a[i - k]
    best = max(best, cur)
  print(best)

if __name__ == "__main__":
  main()`,
  },

  // ── Data Structure ───────────────────────────────────────────────────────
  {
    id: "stack",
    title: "Stack",
    titleKo: "스택",
    category: "data-structure",
    tags: ["data-structure", "stack"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "6\npush 1\npush 2\npop\npush 3\npop\npop",
    code: `import sys

input = sys.stdin.readline

def main():
  q = int(input())
  s = []
  out = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == "push":
      s.append(int(parts[1]))
    else:
      out.append(str(s.pop()))
  sys.stdout.write("\\n".join(out))

if __name__ == "__main__":
  main()`,
  },
  {
    id: "queue",
    title: "Queue",
    titleKo: "큐",
    category: "data-structure",
    tags: ["data-structure", "queue"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "5\npush 1\npush 2\npop\npush 3\npop",
    code: `import sys
from collections import deque

input = sys.stdin.readline

def main():
  q = int(input())
  dq = deque()
  out = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == "push":
      dq.append(int(parts[1]))
    else:
      out.append(str(dq.popleft()))
  sys.stdout.write("\\n".join(out))

if __name__ == "__main__":
  main()`,
  },
  {
    id: "priority-queue",
    title: "Priority Queue",
    titleKo: "우선순위 큐",
    category: "data-structure",
    tags: ["data-structure", "heap"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "3\n3 1 2",
    code: `import heapq
import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  heapq.heapify(a)
  out = []
  while a:
    out.append(str(heapq.heappop(a)))
  print(' '.join(out))

if __name__ == "__main__":
  main()`,
  },

  // ── Graph ────────────────────────────────────────────────────────────────
  {
    id: "bfs",
    title: "BFS",
    titleKo: "너비 우선 탐색",
    category: "graph",
    tags: ["graph", "traversal"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "3 3 0\n0 1\n0 2\n1 2",
    code: `import sys
from collections import deque

input = sys.stdin.readline

def main():
  n, m, st = map(int, input().split())
  g = [[] for _ in range(n)]
  for _ in range(m):
    a, b = map(int, input().split())
    g[a].append(b)
    g[b].append(a)
  for row in g:
    row.sort()
  seen = [False] * n
  q = deque([st])
  seen[st] = True
  out = []
  while q:
    u = q.popleft()
    out.append(u)
    for v in g[u]:
      if not seen[v]:
        seen[v] = True
        q.append(v)
  print(*out)

if __name__ == "__main__":
  main()`,
  },
  {
    id: "dfs",
    title: "DFS",
    titleKo: "깊이 우선 탐색",
    category: "graph",
    tags: ["graph", "traversal"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "3 3 0\n0 1\n0 2\n1 2",
    code: `import sys

input = sys.stdin.readline
sys.setrecursionlimit(1_000_000)

def main():
  n, m, st = map(int, input().split())
  g = [[] for _ in range(n)]
  for _ in range(m):
    a, b = map(int, input().split())
    g[a].append(b)
    g[b].append(a)
  for row in g:
    row.sort()
  seen = [False] * n
  out = []

  def dfs(u):
    seen[u] = True
    out.append(u)
    for v in g[u]:
      if not seen[v]:
        dfs(v)

  dfs(st)
  print(*out)

if __name__ == "__main__":
  main()`,
  },
  {
    id: "dijkstra",
    title: "Dijkstra",
    titleKo: "다익스트라",
    category: "graph",
    tags: ["graph", "shortest-path"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "3 0 1 3\n0 1 4\n0 2 1\n2 1 2",
    code: `import heapq
import sys

input = sys.stdin.readline

def main():
  n, s, t, m = map(int, input().split())
  g = [[] for _ in range(n)]
  for _ in range(m):
    u, v, w = map(int, input().split())
    g[u].append((v, w))
  INF = 10**9
  d = [INF] * n
  d[s] = 0
  pq = [(0, s)]
  while pq:
    du, u = heapq.heappop(pq)
    if du != d[u]:
      continue
    for v, w in g[u]:
      if du + w < d[v]:
        d[v] = du + w
        heapq.heappush(pq, (d[v], v))
  print(d[t])

if __name__ == "__main__":
  main()`,
  },
  {
    id: "union-find",
    title: "Union-Find",
    titleKo: "유니온 파인드",
    category: "graph",
    tags: ["graph", "disjoint-set"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "3 2\n0 1\n1 2",
    code: `import sys

input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  p = list(range(n))

  def find(x):
    if p[x] != x:
      p[x] = find(p[x])
    return p[x]

  def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
      p[ra] = rb

  for _ in range(m):
    a, b = map(int, input().split())
    union(a, b)
  print(1 if find(0) == find(n - 1) else 0)

if __name__ == "__main__":
  main()`,
  },

  // ── DP ───────────────────────────────────────────────────────────────────
  {
    id: "fibonacci",
    title: "Fibonacci (DP)",
    titleKo: "피보나치 (DP)",
    category: "dp",
    tags: ["dp", "memoization"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "10",
    code: `import sys
input = sys.stdin.readline

def main():
  n = int(input())
  if n == 0:
    print(0)
    return
  dp = [0] * (n + 1)
  dp[1] = 1
  for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]
  print(dp[n])

main()`,
  },
  {
    id: "knapsack-01",
    title: "0/1 Knapsack",
    titleKo: "0/1 배낭",
    category: "dp",
    tags: ["dp", "2d-table"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "4 5\n2 3\n3 4\n4 5\n5 6",
    code: `import sys
input = sys.stdin.readline

def main():
  n, W = map(int, input().split())
  items = [tuple(map(int, input().split())) for _ in range(n)]
  dp = [0] * (W + 1)
  for w, v in items:
    for c in range(W, w - 1, -1):
      dp[c] = max(dp[c], dp[c - w] + v)
  print(dp[W])

main()`,
  },
  {
    id: "lcs",
    title: "LCS",
    titleKo: "최장 공통 부분수열",
    category: "dp",
    tags: ["dp", "2d-table"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "ABCBDAB\nBDCAB",
    code: `import sys
input = sys.stdin.readline

def main():
  a = input().strip()
  b = input().strip()
  m, n = len(a), len(b)
  dp = [[0] * (n + 1) for _ in range(m + 1)]
  for i in range(1, m + 1):
    for j in range(1, n + 1):
      if a[i - 1] == b[j - 1]:
        dp[i][j] = dp[i - 1][j - 1] + 1
      else:
        dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
  print(dp[m][n])

main()`,
  },
  {
    id: "prefix-sum",
    title: "Prefix Sum",
    titleKo: "누적합",
    category: "search",
    tags: ["array", "prefix-sum"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "5\n2 1 3 0 4\n1\n1 3",
    code: `import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  ps = [0] * (n + 1)
  for i in range(n):
    ps[i + 1] = ps[i] + a[i]
  q = int(input())
  out = []
  for _ in range(q):
    l, r = map(int, input().split())
    out.append(str(ps[r] - ps[l - 1]))
  sys.stdout.write("\\n".join(out))

if __name__ == "__main__":
  main()`,
  },

  // ── Recursion (직접 작성) ────────────────────────────────────────────────
  {
    id: "factorial",
    title: "Factorial",
    titleKo: "팩토리얼",
    category: "recursion",
    tags: ["recursion", "call-stack"],
    difficulty: "easy",
    language: "python",
    featured: true,
    stdin: "5",
    code: `import sys
input = sys.stdin.readline

def factorial(n):
  if n <= 1:
    return 1
  return n * factorial(n - 1)

n = int(input())
print(factorial(n))`,
  },
  {
    id: "tower-of-hanoi",
    title: "Tower of Hanoi",
    titleKo: "하노이의 탑",
    category: "recursion",
    tags: ["recursion", "divide-and-conquer"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "3",
    code: `import sys
input = sys.stdin.readline

def hanoi(n, src, dst, tmp):
  if n == 0:
    return
  hanoi(n - 1, src, tmp, dst)
  print(src, "->", dst)
  hanoi(n - 1, tmp, dst, src)

n = int(input())
hanoi(n, "A", "C", "B")`,
  },
  {
    id: "n-queens",
    title: "N-Queens (4×4)",
    titleKo: "N-Queens (4×4)",
    category: "recursion",
    tags: ["recursion", "backtracking"],
    difficulty: "medium",
    language: "python",
    featured: true,
    stdin: "4",
    code: `import sys
input = sys.stdin.readline

def solve(n):
  cols = [0] * n
  cnt = 0

  def safe(r, c):
    for i in range(r):
      if cols[i] == c or abs(cols[i] - c) == r - i:
        return False
    return True

  def bt(r):
    nonlocal cnt
    if r == n:
      cnt += 1
      print(*cols[:n])
      return
    for c in range(n):
      if safe(r, c):
        cols[r] = c
        bt(r + 1)

  bt(0)
  print(cnt)

n = int(input())
solve(n)`,
  },
];
