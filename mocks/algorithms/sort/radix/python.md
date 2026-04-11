# radix-sort — Python

```python
import sys

input = sys.stdin.readline

def radix_sort(a):
  exp = 1
  while max(a) // exp > 0:
    buckets = [[] for _ in range(10)]
    for v in a:
      buckets[(v // exp) % 10].append(v)
    a = [v for b in buckets for v in b]
    exp *= 10
  return a

def main():
  n = int(input())
  a = list(map(int, input().split()))
  print(*radix_sort(a))

if __name__ == "__main__":
  main()
```

입력

```
6
170 45 75 90 802 24
```

출력

```
24 45 75 90 170 802
```
