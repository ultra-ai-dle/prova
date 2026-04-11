# Ordered Map — Python

```python
import sys
input = sys.stdin.readline

def main():
  q = int(input())
  d = {}
  result = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == 'put':
      d[int(parts[1])] = int(parts[2])
    elif parts[0] == 'get':
      result.append(str(d[int(parts[1])]))
    elif parts[0] == 'remove':
      del d[int(parts[1])]
    elif parts[0] == 'min':
      result.append(str(min(d.keys())))
  sys.stdout.write('\n'.join(result) + '\n')

main()
```

입력

```
5
put 3 30
put 1 10
put 2 20
min
get 2
```

출력

```
1
20
```
