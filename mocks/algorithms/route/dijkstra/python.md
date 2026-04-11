# dijkstra — Python

```python
import heapq
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
  main()
```

입력

```
3 0 1 3
0 1 4
0 2 1
2 1 2
```

출력

```
3
```
