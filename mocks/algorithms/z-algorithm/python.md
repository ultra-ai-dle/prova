# Z Algorithm — Python

```python
import sys
input = sys.stdin.readline

def z_function(s):
  n = len(s)
  z = [0] * n
  z[0] = n
  l, r = 0, 0
  for i in range(1, n):
    if i < r:
      z[i] = min(r - i, z[i - l])
    while i + z[i] < n and s[z[i]] == s[i + z[i]]:
      z[i] += 1
    if i + z[i] > r:
      l, r = i, i + z[i]
  return z

t = input().strip()
p = input().strip()
s = p + '$' + t
z = z_function(s)
m = len(p)
result = [i - m - 1 for i in range(m + 1, len(s)) if z[i] == m]
print(' '.join(map(str, result)) if result else -1)
```

입력

```
aabxaaabxaaabxaab
aab
```

출력

```
0 5 9 14
```
