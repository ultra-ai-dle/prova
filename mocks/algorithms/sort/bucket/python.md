# bucket-sort — Python

```python
import sys

input = sys.stdin.readline

def insertion_sort(b):
  for i in range(1, len(b)):
    key = b[i]
    j = i - 1
    while j >= 0 and b[j] > key:
      b[j + 1] = b[j]
      j -= 1
    b[j + 1] = key

def bucket_sort(a, k=10):
  buckets = [[] for _ in range(k)]
  for v in a:
    buckets[v * k // 1000].append(v)
  for b in buckets:
    insertion_sort(b)
  return [v for b in buckets for v in b]

def main():
  n = int(input())
  a = list(map(int, input().split()))
  print(*bucket_sort(a))

if __name__ == "__main__":
  main()
```

입력

```
7
64 25 12 22 11 90 45
```

출력

```
11 12 22 25 45 64 90
```
