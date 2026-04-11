# algorithms/sort/counting — Python

```python
import sys
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

count = [0] * 101
for x in arr:
  count[x] += 1

result = []
for i in range(101):
  result.extend([i] * count[i])

print(*result)
```

입력

```
7
4 2 2 8 3 3 1
```

출력

```
1 2 2 3 3 4 8
```
