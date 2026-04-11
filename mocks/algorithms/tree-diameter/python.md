# Tree Diameter — Python

```python
import sys
input = sys.stdin.readline
from collections import deque

def bfs(start, graph, n):
  dist = [-1] * n
  dist[start] = 0
  q = deque([start])
  while q:
    u = q.popleft()
    for v, w in graph[u]:
      if dist[v] == -1:
        dist[v] = dist[u] + w
        q.append(v)
  far = max(range(n), key=lambda x: dist[x])
  return far, dist[far]

n = int(input())
graph = [[] for _ in range(n)]
for _ in range(n - 1):
  u, v, w = map(int, input().split())
  graph[u].append((v, w))
  graph[v].append((u, w))

far1, _ = bfs(0, graph, n)
far2, diameter = bfs(far1, graph, n)
print(diameter)
```

입력

```
5
0 1 2
1 2 3
2 3 1
1 4 5
```

출력

```
9
```
