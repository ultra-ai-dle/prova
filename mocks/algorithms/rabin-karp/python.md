# Rabin-Karp — Python

```python
import sys
input = sys.stdin.readline

def rabin_karp(t, p):
  BASE = 31
  MOD = 10**9 + 7
  n, m = len(t), len(p)
  if m > n:
    return []
  pw = pow(BASE, m - 1, MOD)
  ph = 0
  th = 0
  for i in range(m):
    ph = (ph * BASE + ord(p[i])) % MOD
    th = (th * BASE + ord(t[i])) % MOD
  result = []
  for i in range(n - m + 1):
    if th == ph and t[i:i + m] == p:
      result.append(i)
    if i < n - m:
      th = (th - ord(t[i]) * pw % MOD + MOD) % MOD
      th = (th * BASE + ord(t[i + m])) % MOD
  return result

t = input().strip()
p = input().strip()
ans = rabin_karp(t, p)
print(' '.join(map(str, ans)) if ans else -1)
```

입력

```
GEEKS FOR GEEKS
GEEKS
```

출력

```
0 10
```
