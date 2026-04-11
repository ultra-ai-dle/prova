# Circular Queue — Python

```python
import sys
input = sys.stdin.readline

k = int(input())
q = int(input())
queue = [0] * (k + 1)
front = rear = 0

def enqueue(v):
  nxt = (rear + 1) % (k + 1)
  if nxt == front:
    print('FULL')
    return
  global rear
  queue[rear] = v
  rear = nxt

def dequeue():
  global front
  if front == rear:
    print('EMPTY')
    return
  print(queue[front])
  front = (front + 1) % (k + 1)

def get_front():
  if front == rear:
    print('EMPTY')
    return
  print(queue[front])

for _ in range(q):
  op = input().split()
  if op[0] == 'enqueue':
    enqueue(int(op[1]))
  elif op[0] == 'dequeue':
    dequeue()
  elif op[0] == 'front':
    get_front()
  elif op[0] == 'isEmpty':
    print(0 if front != rear else 1)
```

입력

```
3
7
enqueue 1
enqueue 2
enqueue 3
enqueue 4
dequeue
front
isEmpty
```

출력

```
FULL
1
2
0
```
