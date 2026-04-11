# monotonic-queue — Python

```python
import sys
from collections import deque
input = sys.stdin.readline

def main():
  n, k = map(int, input().split())
  arr = list(map(int, input().split()))
  dq = deque()
  result = []
  for i in range(n):
    while dq and dq[0] < i - k + 1:
      dq.popleft()
    while dq and arr[dq[-1]] < arr[i]:
      dq.pop()
    dq.append(i)
    if i >= k - 1:
      result.append(arr[dq[0]])
  print(*result)

main()
```

입력

```
8 3
1 3 -1 -3 5 3 6 7
```

출력

```
3 3 5 5 6 7
```
