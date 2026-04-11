# 행렬 거듭제곱 (피보나치) — Python

```python
import sys
input = sys.stdin.readline

MOD = 10**9 + 7

def mat_mul(A, B):
  n = len(A)
  C = [[0]*n for _ in range(n)]
  for i in range(n):
    for j in range(n):
      for k in range(n):
        C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD
  return C

def mat_pow(M, p):
  n = len(M)
  result = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
  while p:
    if p & 1:
      result = mat_mul(result, M)
    p >>= 1
    M = mat_mul(M, M)
  return result

n = int(input())
if n == 0:
  print(0)
else:
  M = [[1, 1], [1, 0]]
  print(mat_pow(M, n)[0][1])
```

입력

```
10
```

출력

```
55
```
