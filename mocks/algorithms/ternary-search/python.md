# ternary-search — Python

```python
import sys

input = sys.stdin.readline

def ternary_search(a):
  lo, hi = 0, len(a) - 1
  while hi - lo > 2:
    m1 = lo + (hi - lo) // 3
    m2 = hi - (hi - lo) // 3
    if a[m1] < a[m2]:
      lo = m1
    else:
      hi = m2
  return a.index(max(a[lo:hi + 1]), lo, hi + 1)

def main():
  n = int(input())
  a = list(map(int, input().split()))
  print(ternary_search(a))

if __name__ == "__main__":
  main()
```

입력

```
9
1 3 6 7 9 8 5 2 1
```

출력

```
4
```
