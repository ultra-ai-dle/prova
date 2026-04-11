# deque — Python

```python
import sys
from collections import deque

input = sys.stdin.readline

def main():
  q = int(input())
  d = deque()
  out = []
  for _ in range(q):
    parts = input().split()
    op = parts[0]
    if op == "push_front":
      d.appendleft(int(parts[1]))
    elif op == "push_back":
      d.append(int(parts[1]))
    elif op == "pop_front":
      out.append(str(d.popleft()))
    else:
      out.append(str(d.pop()))
  sys.stdout.write("\n".join(out))

if __name__ == "__main__":
  main()
```

입력

```
6
push_back 1
push_back 2
push_front 0
pop_front
pop_back
pop_front
```

출력

```
0
2
1
```
