# Hash Set — Python

```python
import sys
input = sys.stdin.readline

def main():
  q = int(input())
  s = set()
  result = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == 'add':
      s.add(int(parts[1]))
    elif parts[0] == 'remove':
      s.discard(int(parts[1]))
    elif parts[0] == 'contains':
      result.append('1' if int(parts[1]) in s else '0')
    elif parts[0] == 'size':
      result.append(str(len(s)))
  sys.stdout.write('\n'.join(result) + '\n')

main()
```

입력

```
6
add 5
add 3
add 5
contains 5
remove 5
contains 5
```

출력

```
1
0
```
