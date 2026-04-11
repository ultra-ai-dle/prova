# algorithms/sort/selection — Python

```python
import sys
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

for i in range(n):
  min_idx = i
  for j in range(i + 1, n):
    if arr[j] < arr[min_idx]:
      min_idx = j
  arr[i], arr[min_idx] = arr[min_idx], arr[i]

print(*arr)
```

입력

```
6
5 3 8 1 4 2
```

출력

```
1 2 3 4 5 8
```
