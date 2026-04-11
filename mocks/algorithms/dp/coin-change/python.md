# Coin Change — Python

```python
import sys
input = sys.stdin.readline

def main():
  k, amount = map(int, input().split())
  coins = list(map(int, input().split()))
  INF = float('inf')
  dp = [INF] * (amount + 1)
  dp[0] = 0
  for c in coins:
    for x in range(c, amount + 1):
      if dp[x - c] + 1 < dp[x]:
        dp[x] = dp[x - c] + 1
  print(dp[amount] if dp[amount] != INF else -1)

main()
```

입력

```
3 11
1 5 6
```

출력

```
2
```
