# hash-table — Python

`dict` — 키는 문자열 한 글자 또는 짧은 토큰.

```python
import sys

input = sys.stdin.readline

def main():
  q = int(input())
  d = {}
  out = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == "set":
      d[parts[1]] = int(parts[2])
    else:
      out.append(str(d.get(parts[1], 0)))
  sys.stdout.write("\n".join(out))

if __name__ == "__main__":
  main()
```

입력

```
6
set a 10
get a
set b 20
get b
set a 30
get a
```

출력

```
10
20
30
```
