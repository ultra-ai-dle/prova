# 무방향 그래프 인접 행렬 — Python

```python
import sys
input = sys.stdin.readline

n, m = map(int, input().split())
mat = [[0] * n for _ in range(n)]

for _ in range(m):
  u, v = map(int, input().split())
  mat[u][v] = 1
  mat[v][u] = 1

for row in mat:
  print(' '.join(map(str, row)))
```

입력

```
4 4
0 1
0 2
1 3
2 3
```

출력

```
0 1 1 0
1 0 0 1
1 0 0 1
0 1 1 0
```
