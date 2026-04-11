# algorithms/range-query — Python

```python
import sys
input = sys.stdin.readline

def solve():
  n = int(input())
  arr = list(map(int, input().split()))
  tree = [0] * (4 * n)

  def build(node, start, end):
    if start == end:
      tree[node] = arr[start]
    else:
      mid = (start + end) // 2
      build(2 * node, start, mid)
      build(2 * node + 1, mid + 1, end)
      tree[node] = min(tree[2 * node], tree[2 * node + 1])

  def query(node, start, end, l, r):
    if r < start or end < l:
      return float('inf')
    if l <= start and end <= r:
      return tree[node]
    mid = (start + end) // 2
    return min(query(2 * node, start, mid, l, r),
               query(2 * node + 1, mid + 1, end, l, r))

  build(1, 0, n - 1)
  q = int(input())
  for _ in range(q):
    l, r = map(int, input().split())
    print(query(1, 0, n - 1, l, r))

solve()
```

입력

```
8
2 4 3 1 6 7 8 5
3
1 5
0 7
3 6
```

출력

```
1
1
1
```
