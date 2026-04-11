# upper-bound — Python

```python
import sys
input = sys.stdin.readline

def upper_bound(arr, target):
  lo, hi = 0, len(arr)
  while lo < hi:
    mid = (lo + hi) // 2
    if arr[mid] <= target:
      lo = mid + 1
    else:
      hi = mid
  return lo

n = int(input())
arr = list(map(int, input().split()))
target = int(input())
print(upper_bound(arr, target))
```

입력

```
7
1 2 4 4 5 7 9
4
```

출력

```
4
```
