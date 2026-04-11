# prim — Python

```python
import heapq
import sys

input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  g = [[] for _ in range(n)]
  for _ in range(m):
    u, v, w = map(int, input().split())
    g[u].append((w, v))
    g[v].append((w, u))
  INF = 10**9
  visited = [False] * n
  total = 0
  pq = [(0, 0)]
  while pq:
    cost, u = heapq.heappop(pq)
    if visited[u]:
      continue
    visited[u] = True
    total += cost
    for w, v in g[u]:
      if not visited[v]:
        heapq.heappush(pq, (w, v))
  print(total)

if __name__ == "__main__":
  main()
```

입력

```
5 7
0 1 2
0 3 6
1 2 3
1 3 8
1 4 5
2 4 7
3 4 9
```

출력

```
17
```
