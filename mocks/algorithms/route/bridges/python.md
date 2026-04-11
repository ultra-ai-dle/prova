# Bridges — Python

```python
import sys
input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  graph = [[] for _ in range(n)]
  for _ in range(m):
    u, v = map(int, input().split())
    graph[u].append(v)
    graph[v].append(u)

  disc = [-1] * n
  low = [0] * n
  timer = [0]
  bridges = []

  def dfs(u, parent):
    disc[u] = low[u] = timer[0]
    timer[0] += 1
    stack = [(u, parent, iter(graph[u]))]
    path = []
    while stack:
      node, par, it = stack[-1]
      try:
        nb = next(it)
        if nb == par:
          continue
        if disc[nb] == -1:
          disc[nb] = low[nb] = timer[0]
          timer[0] += 1
          path.append((node, nb))
          stack.append((nb, node, iter(graph[nb])))
        else:
          low[node] = min(low[node], disc[nb])
      except StopIteration:
        stack.pop()
        if stack:
          p = stack[-1][0]
          low[p] = min(low[p], low[node])
          if low[node] > disc[p]:
            bridges.append((min(p, node), max(p, node)))

  for i in range(n):
    if disc[i] == -1:
      dfs(i, -1)

  bridges.sort()
  out = [f"{u} {v}" for u, v in bridges]
  print('\n'.join(out))

main()
```

입력

```
5 5
0 1
1 2
2 0
1 3
3 4
```

출력

```
1 3
3 4
```
