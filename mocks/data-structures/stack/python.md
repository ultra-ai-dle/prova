# stack — Python

```python
import sys

input = sys.stdin.readline

def main():
  q = int(input())
  s = []
  out = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == "push":
      s.append(int(parts[1]))
    else:
      out.append(str(s.pop()))
  sys.stdout.write("\n".join(out))

if __name__ == "__main__":
  main()
```

입력

```
6
push 1
push 2
pop
push 3
pop
pop
```

출력

```
2
3
1
```
