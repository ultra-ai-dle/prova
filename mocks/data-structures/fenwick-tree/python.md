# 펜윅 트리 — Python

```python
import sys
input = sys.stdin.readline

def update(i, val):
  while i <= n:
    tree[i] += val
    i += i & (-i)

def prefix_sum(i):
  s = 0
  while i > 0:
    s += tree[i]
    i -= i & (-i)
  return s

n = int(input())
tree = [0] * (n + 1)

q = int(input())
result = []
for _ in range(q):
  op = input().split()
  if op[0] == 'update':
    update(int(op[1]), int(op[2]))
  else:
    result.append(prefix_sum(int(op[1])))

print('\n'.join(map(str, result)))
```

입력

```
6
3
update 2 5
update 4 3
query 5
```

출력

```
8
```
