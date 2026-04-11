# singly-linked-list — Python

입력 순서로 리스트를 만든 뒤 **in-place 역전**.

```python
import sys

input = sys.stdin.readline

class Node:
  __slots__ = ('v', 'nxt')
  def __init__(self, v):
    self.v = v
    self.nxt = None

def main():
  n = int(input())
  vals = list(map(int, input().split()))
  head = None
  for x in reversed(vals):
    nd = Node(x)
    nd.nxt = head
    head = nd
  prev = None
  cur = head
  while cur:
    nxt = cur.nxt
    cur.nxt = prev
    prev = cur
    cur = nxt
  out = []
  cur = prev
  while cur:
    out.append(str(cur.v))
    cur = cur.nxt
  print(*out)

if __name__ == "__main__":
  main()
```

입력

```
5
1 2 3 4 5
```

출력

```
5 4 3 2 1
```
