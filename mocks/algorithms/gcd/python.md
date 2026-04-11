# gcd — Python

```python
import sys
input = sys.stdin.readline

def gcd(a, b):
  while b:
    a, b = b, a % b
  return a

a, b = map(int, input().split())
g = gcd(a, b)
lcm = a // g * b
print(g, lcm)
```

입력

```
48 18
```

출력

```
6 144
```
