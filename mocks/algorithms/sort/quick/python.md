# quicksort — Python

Lomuto 파티션.

```python
import sys

input = sys.stdin.readline

def partition(a, lo, hi):
  p = a[hi]
  i = lo
  for j in range(lo, hi):
    if a[j] <= p:
      a[i], a[j] = a[j], a[i]
      i += 1
  a[i], a[hi] = a[hi], a[i]
  return i

def qsort(a, lo, hi):
  if lo < hi:
    q = partition(a, lo, hi)
    qsort(a, lo, q - 1)
    qsort(a, q + 1, hi)

def main():
  n = int(input())
  a = list(map(int, input().split()))
  qsort(a, 0, n - 1)
  print(*a)

if __name__ == "__main__":
  main()
```

입력

```
4
3 1 4 2
```

출력

```
1 2 3 4
```
