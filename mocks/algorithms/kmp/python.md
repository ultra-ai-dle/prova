# KMP — Python

```python
import sys
input = sys.stdin.readline

def build_failure(p):
  m = len(p)
  fail = [0] * m
  j = 0
  for i in range(1, m):
    while j > 0 and p[i] != p[j]:
      j = fail[j - 1]
    if p[i] == p[j]:
      j += 1
    fail[i] = j
  return fail

def kmp(t, p):
  fail = build_failure(p)
  result = []
  j = 0
  for i in range(len(t)):
    while j > 0 and t[i] != p[j]:
      j = fail[j - 1]
    if t[i] == p[j]:
      j += 1
    if j == len(p):
      result.append(i - len(p) + 1)
      j = fail[j - 1]
  return result

t = input().strip()
p = input().strip()
ans = kmp(t, p)
print(' '.join(map(str, ans)) if ans else -1)
```

입력

```
AABAACAADAABAABA
AABA
```

출력

```
0 9 12
```
