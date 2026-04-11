# sliding-window — Python

길이 `k` 인 **연속 부분배열** 합의 최댓값.

```python
import sys

input = sys.stdin.readline

def main():
  n, k = map(int, input().split())
  a = list(map(int, input().split()))
  cur = sum(a[:k])
  best = cur
  for i in range(k, n):
    cur += a[i] - a[i - k]
    best = max(best, cur)
  print(best)

if __name__ == "__main__":
  main()
```

입력

```
4 2
3 1 5 2
```

출력

```
7
```
