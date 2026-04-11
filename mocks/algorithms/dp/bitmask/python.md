# Bitmask DP — Python

```python
import sys
input = sys.stdin.readline

INF = float('inf')
n = int(input())
dist = [list(map(int, input().split())) for _ in range(n)]

dp = [[INF] * n for _ in range(1 << n)]
dp[1][0] = 0

for mask in range(1 << n):
  for u in range(n):
    if dp[mask][u] == INF:
      continue
    if not (mask >> u & 1):
      continue
    for v in range(n):
      if mask >> v & 1:
        continue
      nmask = mask | (1 << v)
      cost = dp[mask][u] + dist[u][v]
      if cost < dp[nmask][v]:
        dp[nmask][v] = cost

full = (1 << n) - 1
ans = INF
for u in range(1, n):
  if dp[full][u] + dist[u][0] < ans:
    ans = dp[full][u] + dist[u][0]
print(ans)
```

입력

```
4
0 10 15 20
5 0 9 10
6 13 0 12
8 8 9 0
```

출력

```
35
```
