# algorithms/sort/bubble — Python

```python
import sys
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

for i in range(n):
  for j in range(n - 1 - i):
    if arr[j] > arr[j + 1]:
      arr[j], arr[j + 1] = arr[j + 1], arr[j]

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
