# Doubly Linked List — Python

```python
import sys
input = sys.stdin.readline

class Node:
  def __init__(self, val):
    self.val = val
    self.prev = None
    self.next = None

class DoublyLinkedList:
  def __init__(self):
    self.head = None
    self.tail = None

  def push_back(self, v):
    node = Node(v)
    if not self.tail:
      self.head = self.tail = node
    else:
      node.prev = self.tail
      self.tail.next = node
      self.tail = node

  def push_front(self, v):
    node = Node(v)
    if not self.head:
      self.head = self.tail = node
    else:
      node.next = self.head
      self.head.prev = node
      self.head = node

  def pop_back(self):
    if not self.tail:
      return
    if self.head == self.tail:
      self.head = self.tail = None
    else:
      self.tail = self.tail.prev
      self.tail.next = None

  def pop_front(self):
    if not self.head:
      return
    if self.head == self.tail:
      self.head = self.tail = None
    else:
      self.head = self.head.next
      self.head.prev = None

  def print_all(self):
    res = []
    cur = self.head
    while cur:
      res.append(str(cur.val))
      cur = cur.next
    print(' '.join(res))

n = int(input())
dll = DoublyLinkedList()
for _ in range(n):
  op = input().split()
  if op[0] == 'push_back':
    dll.push_back(int(op[1]))
  elif op[0] == 'push_front':
    dll.push_front(int(op[1]))
  elif op[0] == 'pop_back':
    dll.pop_back()
  elif op[0] == 'pop_front':
    dll.pop_front()
  elif op[0] == 'print':
    dll.print_all()
```

입력

```
6
push_back 1
push_back 2
push_front 0
pop_front
push_back 3
print
```

출력

```
1 2 3
```
