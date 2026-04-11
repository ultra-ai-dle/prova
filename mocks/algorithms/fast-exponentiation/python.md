# fast-exponentiation — Python

```python
import sys
input = sys.stdin.readline

def power(a, b, m):
  result = 1
  a %= m
  while b > 0:
    if b & 1:
      result = result * a % m
    a = a * a % m
    b >>= 1
  return result

a, b, m = map(int, input().split())
print(power(a, b, m))
```

입력

```
2 10 1000000007
```

출력

```
1024
```
