# Knapsack 0-1 — Python

```python
import sys
input = sys.stdin.readline

def main():
  n, W = map(int, input().split())
  items = [tuple(map(int, input().split())) for _ in range(n)]
  dp = [0] * (W + 1)
  for w, v in items:
    for c in range(W, w - 1, -1):
      dp[c] = max(dp[c], dp[c - w] + v)
  print(dp[W])

main()
```

입력

```
4 5
2 3
3 4
4 5
5 6
```

출력

```
7
```
