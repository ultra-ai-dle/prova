# binary-tree — Python

```python
import sys
from collections import deque
input = sys.stdin.readline

def main():
  n = int(input())
  vals = list(map(int, input().split()))

  nodes = [None if v == -1 else [v, None, None] for v in vals]
  for i in range(n):
    if nodes[i] is None:
      continue
    l, r = 2 * i + 1, 2 * i + 2
    if l < n and nodes[l] is not None:
      nodes[i][1] = nodes[l]
    if r < n and nodes[r] is not None:
      nodes[i][2] = nodes[r]
  root = nodes[0]

  pre, ino, post = [], [], []

  def preorder(node):
    if node is None:
      return
    pre.append(node[0])
    preorder(node[1])
    preorder(node[2])

  def inorder(node):
    if node is None:
      return
    inorder(node[1])
    ino.append(node[0])
    inorder(node[2])

  def postorder(node):
    if node is None:
      return
    postorder(node[1])
    postorder(node[2])
    post.append(node[0])

  preorder(root)
  inorder(root)
  postorder(root)
  print(*pre)
  print(*ino)
  print(*post)

main()
```

입력

```
7
1 2 3 4 5 6 7
```

출력

```
1 2 4 5 3 6 7
4 2 5 1 6 3 7
4 5 2 6 7 3 1
```
