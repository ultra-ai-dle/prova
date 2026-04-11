# topological-sort — Python

**Kahn** + **최소 힙**으로 동차일 때 작은 번호 정점부터.

```python
import heapq
import sys

input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  g = [[] for _ in range(n)]
  indeg = [0] * n
  for _ in range(m):
    u, v = map(int, input().split())
    g[u].append(v)
    indeg[v] += 1
  for row in g:
    row.sort()
  q = [i for i in range(n) if indeg[i] == 0]
  heapq.heapify(q)
  out = []
  while q:
    u = heapq.heappop(q)
    out.append(u)
    for v in g[u]:
      indeg[v] -= 1
      if indeg[v] == 0:
        heapq.heappush(q, v)
  print(*out)

if __name__ == "__main__":
  main()
```

입력

```
4 4
0 1
0 2
1 3
2 3
```

출력

```
0 1 2 3
```
