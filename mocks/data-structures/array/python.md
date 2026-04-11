# Array — Python

```python
import sys
input = sys.stdin.readline

def main():
  n = int(input())
  arr = list(map(int, input().split()))
  q = int(input())
  result = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == 'get':
      i = int(parts[1])
      result.append(str(arr[i]))
    elif parts[0] == 'set':
      i, v = int(parts[1]), int(parts[2])
      arr[i] = v
    elif parts[0] == 'print':
      result.append(' '.join(map(str, arr)))
  sys.stdout.write('\n'.join(result) + '\n')

main()
```

입력

```
5
1 2 3 4 5
4
get 2
set 2 99
get 2
print
```

출력

```
3
99
1 2 99 4 5
```
