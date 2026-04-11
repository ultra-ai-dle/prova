# 이항 계수 C(n, k) mod 1e9+7 — Python

```python
import sys
input = sys.stdin.readline

MOD = 10**9 + 7

n, k = map(int, input().split())
dp = [[0] * (n + 1) for _ in range(n + 1)]
for i in range(n + 1):
  dp[i][0] = 1
  for j in range(1, i + 1):
    dp[i][j] = (dp[i-1][j-1] + dp[i-1][j]) % MOD

print(dp[n][k])
```

입력

```
10 3
```

출력

```
120
```
