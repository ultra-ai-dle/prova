# Articulation Points — Python

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
  is_ap = [False] * n

  for start in range(n):
    if disc[start] != -1:
      continue
    disc[start] = low[start] = timer[0]
    timer[0] += 1
    stack = [(start, -1, 0)]

    while stack:
      node, par, i = stack[-1]
      if i < len(graph[node]):
        stack[-1] = (node, par, i + 1)
        nb = graph[node][i]
        if nb == par:
          continue
        if disc[nb] == -1:
          disc[nb] = low[nb] = timer[0]
          timer[0] += 1
          stack.append((nb, node, 0))
        else:
          low[node] = min(low[node], disc[nb])
      else:
        stack.pop()
        if stack:
          p, pp, pi = stack[-1]
          low[p] = min(low[p], low[node])
          children = sum(1 for nb in graph[p] if disc[nb] != -1 and low[nb] >= disc[p] and nb != pp)
          if pp == -1:
            root_children = sum(1 for nb in graph[p] if disc[nb] > disc[p])
            if root_children >= 2:
              is_ap[p] = True
          elif low[node] >= disc[p]:
            is_ap[p] = True

  result = sorted(i for i in range(n) if is_ap[i])
  print('\n'.join(map(str, result)))

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
1
3
```
