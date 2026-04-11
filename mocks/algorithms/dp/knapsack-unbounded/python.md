# algorithms/dp/knapsack-unbounded — Python

```python
import sys
input = sys.stdin.readline

def solve():
  n, W = map(int, input().split())
  items = [tuple(map(int, input().split())) for _ in range(n)]
  dp = [0] * (W + 1)
  for c in range(1, W + 1):
    for w, v in items:
      if w <= c:
        dp[c] = max(dp[c], dp[c - w] + v)
  print(dp[W])

solve()
```

입력

```
4 8
2 3
3 4
4 5
5 6
```

출력

```
12
```
