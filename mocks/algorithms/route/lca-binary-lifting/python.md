# LCA (Binary Lifting) — Python

```python
import sys
input = sys.stdin.readline
from math import log2

def main():
  n = int(input())
  graph = [[] for _ in range(n)]
  for _ in range(n - 1):
    u, v = map(int, input().split())
    graph[u].append(v)
    graph[v].append(u)

  LOG = max(1, int(log2(n)) + 1) if n > 1 else 1
  depth = [-1] * n
  up = [[-1] * n for _ in range(LOG)]

  depth[0] = 0
  stack = [0]
  while stack:
    node = stack.pop()
    for nb in graph[node]:
      if depth[nb] == -1:
        depth[nb] = depth[node] + 1
        up[0][nb] = node
        stack.append(nb)
  up[0][0] = 0

  for k in range(1, LOG):
    for v in range(n):
      if up[k-1][v] != -1:
        up[k][v] = up[k-1][up[k-1][v]]

  def lca(u, v):
    if depth[u] < depth[v]:
      u, v = v, u
    diff = depth[u] - depth[v]
    for k in range(LOG):
      if (diff >> k) & 1:
        u = up[k][u]
    if u == v:
      return u
    for k in range(LOG - 1, -1, -1):
      if up[k][u] != up[k][v]:
        u = up[k][u]
        v = up[k][v]
    return up[0][u]

  q = int(input())
  out = []
  for _ in range(q):
    u, v = map(int, input().split())
    out.append(str(lca(u, v)))
  print('\n'.join(out))

main()
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
3
3 4
5 6
3 5
```

출력

```
1
2
0
```
