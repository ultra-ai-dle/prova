# 확장 유클리드 알고리즘 — Python

```python
import sys
input = sys.stdin.readline

def extended_gcd(a, b):
  if b == 0:
    return a, 1, 0
  g, x, y = extended_gcd(b, a % b)
  return g, y, x - (a // b) * y

a, b = map(int, input().split())
g, x, y = extended_gcd(a, b)
print(g, x, y)
```

입력

```
35 15
```

출력

```
5 1 -2
```
