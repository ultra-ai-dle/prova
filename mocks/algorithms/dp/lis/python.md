# LIS — Python

```python
import sys
from bisect import bisect_left
input = sys.stdin.readline

def main():
  n = int(input())
  arr = list(map(int, input().split()))
  tails = []
  for x in arr:
    pos = bisect_left(tails, x)
    if pos == len(tails):
      tails.append(x)
    else:
      tails[pos] = x
  print(len(tails))

main()
```

입력

```
8
3 1 4 1 5 9 2 6
```

출력

```
4
```
