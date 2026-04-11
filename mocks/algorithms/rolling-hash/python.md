# Rolling Hash — Python

```python
import sys
input = sys.stdin.readline

BASE = 31
MOD = 10**9 + 7

s = input().strip()
k = int(input().strip())
n = len(s)

pw = [1] * (k + 1)
for i in range(1, k + 1):
  pw[i] = pw[i - 1] * BASE % MOD

h = 0
for i in range(k):
  h = (h * BASE + (ord(s[i]) - ord('a') + 1)) % MOD

result = [h]
for i in range(1, n - k + 1):
  h = (h - (ord(s[i - 1]) - ord('a') + 1) * pw[k - 1] % MOD + MOD) % MOD
  h = (h * BASE + (ord(s[i + k - 1]) - ord('a') + 1)) % MOD
  result.append(h)

print(' '.join(map(str, result)))
```

입력

```
abcde
3
```

출력

```
1026 2019 3012
```
