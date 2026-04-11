# algorithms/sort/insertion — Python

```python
import sys
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

for i in range(1, n):
  key = arr[i]
  j = i - 1
  while j >= 0 and arr[j] > key:
    arr[j + 1] = arr[j]
    j -= 1
  arr[j + 1] = key

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
