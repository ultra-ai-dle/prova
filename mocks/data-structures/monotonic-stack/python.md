# monotonic-stack — Python

```python
import sys
input = sys.stdin.readline

def main():
  n = int(input())
  arr = list(map(int, input().split()))
  result = [-1] * n
  stack = []
  for i in range(n):
    while stack and arr[stack[-1]] < arr[i]:
      result[stack.pop()] = i
    stack.append(i)
  print(*result)

main()
```

입력

```
6
2 1 5 6 2 3
```

출력

```
2 2 3 -1 5 -1
```
