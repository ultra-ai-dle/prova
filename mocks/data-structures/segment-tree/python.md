# 구간 합 세그먼트 트리 — Python

```python
import sys
input = sys.stdin.readline

def build(node, start, end):
  if start == end:
    tree[node] = arr[start]
  else:
    mid = (start + end) // 2
    build(2*node, start, mid)
    build(2*node+1, mid+1, end)
    tree[node] = tree[2*node] + tree[2*node+1]

def update(node, start, end, idx, val):
  if start == end:
    arr[idx] = val
    tree[node] = val
  else:
    mid = (start + end) // 2
    if idx <= mid:
      update(2*node, start, mid, idx, val)
    else:
      update(2*node+1, mid+1, end, idx, val)
    tree[node] = tree[2*node] + tree[2*node+1]

def query(node, start, end, l, r):
  if r < start or end < l:
    return 0
  if l <= start and end <= r:
    return tree[node]
  mid = (start + end) // 2
  return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r)

n = int(input())
arr = list(map(int, input().split()))
tree = [0] * (4 * n)
build(1, 0, n-1)

q = int(input())
result = []
for _ in range(q):
  op = input().split()
  if op[0] == 'update':
    update(1, 0, n-1, int(op[1]), int(op[2]))
  else:
    result.append(query(1, 0, n-1, int(op[1]), int(op[2])))

print('\n'.join(map(str, result)))
```

입력

```
5
1 2 3 4 5
3
update 1 10
query 0 3
query 2 4
```

출력

```
17
12
```
