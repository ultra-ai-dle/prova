# 정수 집합 비트셋 — Python

```python
import sys
input = sys.stdin.readline

n = int(input())
bits = 0

q = int(input())
result = []
for _ in range(q):
  op = input().split()
  if op[0] == 'set':
    bits |= (1 << int(op[1]))
  elif op[0] == 'clear':
    bits &= ~(1 << int(op[1]))
  elif op[0] == 'flip':
    bits ^= (1 << int(op[1]))
  elif op[0] == 'get':
    result.append((bits >> int(op[1])) & 1)
  elif op[0] == 'count':
    result.append(bin(bits).count('1'))

print('\n'.join(map(str, result)))
```

입력

```
64
5
set 3
set 7
flip 3
get 3
count
```

출력

```
0
1
```
