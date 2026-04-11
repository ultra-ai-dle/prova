# priority-queue — Python

`heapq` = min-heap

```python
import heapq
import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  heapq.heapify(a)
  out = []
  while a:
    out.append(str(heapq.heappop(a)))
  print(' '.join(out))

if __name__ == "__main__":
  main()
```

입력

```
3
3 1 2
```

출력

```
1 2 3
```
