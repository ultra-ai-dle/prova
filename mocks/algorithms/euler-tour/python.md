# algorithms/euler-tour — Python

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

  tin = [0] * n
  tout = [0] * n
  timer = [0]

  def dfs(u, parent):
    tin[u] = timer[0]
    timer[0] += 1
    for v in adj[u]:
      if v != parent:
        dfs(v, u)
    tout[u] = timer[0]
    timer[0] += 1

  dfs(0, -1)
  for i in range(n):
    print(tin[i], tout[i])

solve()
```

입력

```
5
0 1
0 2
1 3
1 4
```

출력

```
0 9
1 6
7 8
2 3
4 5
```
