# queue — Python

```python
import sys
from collections import deque

input = sys.stdin.readline

def main():
  q = int(input())
  dq = deque()
  out = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == "push":
      dq.append(int(parts[1]))
    else:
      out.append(str(dq.popleft()))
  sys.stdout.write("\n".join(out))

if __name__ == "__main__":
  main()
```

입력

```
5
push 1
push 2
pop
push 3
pop
```

출력

```
1
2
```
