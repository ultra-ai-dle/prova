# String Builder — Python

```python
import sys
input = sys.stdin.readline

def main():
  q = int(input())
  parts_list = []
  result = []
  for _ in range(q):
    line = input().rstrip('\n')
    cmd, _, arg = line.partition(' ')
    if cmd == 'append':
      parts_list.append(arg)
    elif cmd == 'prepend':
      parts_list.insert(0, arg)
    elif cmd == 'build':
      result.append(''.join(parts_list))
  sys.stdout.write('\n'.join(result) + '\n')

main()
```

입력

```
4
append hello
append  world
prepend say 
build
```

출력

```
say hello world
```
