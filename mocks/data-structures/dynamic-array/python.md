# Dynamic Array — Python

```python
import sys
input = sys.stdin.readline

def main():
  q = int(input())
  arr = []
  result = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == 'push':
      arr.append(int(parts[1]))
    elif parts[0] == 'pop':
      result.append(str(arr.pop()))
    elif parts[0] == 'get':
      result.append(str(arr[int(parts[1])]))
    elif parts[0] == 'size':
      result.append(str(len(arr)))
  sys.stdout.write('\n'.join(result) + '\n')

main()
```

입력

```
6
push 10
push 20
push 30
pop
size
get 0
```

출력

```
30
2
10
```
