# LCA — Python

```python
import sys
input = sys.stdin.readline

def main():
  n = int(input())
  graph = [[] for _ in range(n)]
  for _ in range(n - 1):
    u, v = map(int, input().split())
    graph[u].append(v)
    graph[v].append(u)

  depth = [-1] * n
  parent = [-1] * n
  depth[0] = 0
  stack = [0]
  while stack:
    node = stack.pop()
    for nb in graph[node]:
      if depth[nb] == -1:
        depth[nb] = depth[node] + 1
        parent[nb] = node
        stack.append(nb)

  def lca(u, v):
    while depth[u] > depth[v]:
      u = parent[u]
    while depth[v] > depth[u]:
      v = parent[v]
    while u != v:
      u = parent[u]
      v = parent[v]
    return u

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
