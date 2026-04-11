# bst — Python

```python
import sys
input = sys.stdin.readline

class Node:
  def __init__(self, v):
    self.v = v
    self.left = None
    self.right = None

def insert(root, v):
  if root is None:
    return Node(v)
  if v < root.v:
    root.left = insert(root.left, v)
  elif v > root.v:
    root.right = insert(root.right, v)
  return root

def search(root, v):
  if root is None:
    return 0
  if v == root.v:
    return 1
  if v < root.v:
    return search(root.left, v)
  return search(root.right, v)

def inorder(root, result):
  if root is None:
    return
  inorder(root.left, result)
  result.append(root.v)
  inorder(root.right, result)

def main():
  q = int(input())
  root = None
  out = []
  for _ in range(q):
    line = input().split()
    if line[0] == 'insert':
      root = insert(root, int(line[1]))
    elif line[0] == 'search':
      out.append(str(search(root, int(line[1]))))
    elif line[0] == 'inorder':
      result = []
      inorder(root, result)
      out.append(' '.join(map(str, result)))
  print('\n'.join(out))

main()
```

입력

```
6
insert 5
insert 3
insert 7
insert 1
search 3
inorder
```

출력

```
1
1 3 5 7
```
