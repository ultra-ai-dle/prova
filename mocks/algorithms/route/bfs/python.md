# bfs — Python

```python
import sys
from collections import deque

input = sys.stdin.readline

def main():
  n, m, st = map(int, input().split())
  g = [[] for _ in range(n)]
  for _ in range(m):
    a, b = map(int, input().split())
    g[a].append(b)
    g[b].append(a)
  for row in g:
    row.sort()
  seen = [False] * n
  q = deque([st])
  seen[st] = True
  out = []
  while q:
    u = q.popleft()
    out.append(u)
    for v in g[u]:
      if not seen[v]:
        seen[v] = True
        q.append(v)
  print(*out)

if __name__ == "__main__":
  main()
```

입력

```
3 3 0
0 1
0 2
1 2
```

출력

```
0 1 2
```
