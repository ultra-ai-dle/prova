# binary-search — Python

정렬된 배열에서 **lower_bound**: 첫 번째 `a[i] >= x` 인 인덱스 `i` (없으면 `n`).

```python
import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  x = int(input())
  lo, hi = 0, n
  while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < x:
      lo = mid + 1
    else:
      hi = mid
  print(lo)

if __name__ == "__main__":
  main()
```

입력

```
6
1 3 5 7 9 11
6
```

출력

```
3
```
