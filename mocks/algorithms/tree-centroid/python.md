# algorithms/tree-centroid — Python

```python
import sys
input = sys.stdin.readline
sys.setrecursionlimit(200000)

def solve():
  n = int(input())
  adj = [[] for _ in range(n)]
  for _ in range(n - 1):
    u, v = map(int, input().split())
    adj[u].append(v)
    adj[v].append(u)

  size = [1] * n

  def calc_size(u, parent):
    for v in adj[u]:
      if v != parent:
        calc_size(v, u)
        size[u] += size[v]

  calc_size(0, -1)

  result = []
  for u in range(n):
    max_comp = n - size[u]
    for v in adj[u]:
      if size[v] < size[u]:
        max_comp = max(max_comp, size[v])
    if max_comp <= n // 2:
      result.append(u)

  for c in sorted(result):
    print(c)

solve()
```

입력

```
7
0 1
0 2
1 3
1 4
2 5
2 6
```

출력

```
0
```
