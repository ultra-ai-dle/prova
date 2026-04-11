# Kosaraju — Python

```python
import sys
input = sys.stdin.readline
sys.setrecursionlimit(200000)

def main():
  n, m = map(int, input().split())
  graph = [[] for _ in range(n)]
  rev = [[] for _ in range(n)]
  for _ in range(m):
    u, v = map(int, input().split())
    graph[u].append(v)
    rev[v].append(u)

  visited = [False] * n
  order = []

  def dfs1(v):
    stack = [(v, 0)]
    while stack:
      node, i = stack.pop()
      if i == 0:
        if visited[node]:
          continue
        visited[node] = True
        stack.append((node, 1))
        for nb in graph[node]:
          if not visited[nb]:
            stack.append((nb, 0))
      else:
        order.append(node)

  for i in range(n):
    if not visited[i]:
      dfs1(i)

  visited2 = [False] * n
  scc_count = 0

  def dfs2(v):
    stack = [v]
    while stack:
      node = stack.pop()
      for nb in rev[node]:
        if not visited2[nb]:
          visited2[nb] = True
          stack.append(nb)

  for v in reversed(order):
    if not visited2[v]:
      visited2[v] = True
      dfs2(v)
      scc_count += 1

  print(scc_count)

main()
```

입력

```
5 6
0 1
1 2
2 0
1 3
3 4
4 3
```

출력

```
3
```
