# difference-array — Python

```python
import sys
input = sys.stdin.readline

n, q = map(int, input().split())
diff = [0] * (n + 1)
for _ in range(q):
  l, r, v = map(int, input().split())
  diff[l] += v
  if r + 1 <= n:
    diff[r + 1] -= v

arr = [0] * n
arr[0] = diff[0]
for i in range(1, n):
  arr[i] = arr[i - 1] + diff[i]

print(*arr)
```

입력

```
6 3
1 3 2
2 5 3
0 1 4
```

출력

```
4 6 5 5 3 0
```
