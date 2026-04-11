# 구간 최솟값 쿼리 (스파스 테이블) — Python

```python
import sys
import math
input = sys.stdin.readline

n = int(input())
arr = list(map(int, input().split()))

LOG = max(1, math.floor(math.log2(n)) + 1) if n > 0 else 1
sparse = [[float('inf')] * n for _ in range(LOG)]
sparse[0] = arr[:]

for j in range(1, LOG):
  for i in range(n - (1 << j) + 1):
    sparse[j][i] = min(sparse[j-1][i], sparse[j-1][i + (1 << (j-1))])

def query(l, r):
  length = r - l + 1
  k = math.floor(math.log2(length))
  return min(sparse[k][l], sparse[k][r - (1 << k) + 1])

q = int(input())
result = []
for _ in range(q):
  l, r = map(int, input().split())
  result.append(query(l, r))

print('\n'.join(map(str, result)))
```

입력

```
7
2 4 3 1 6 7 8
3
1 5
0 6
2 4
```

출력

```
1
1
1
```
