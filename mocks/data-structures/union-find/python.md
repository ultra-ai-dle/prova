# union-find — Python

```python
import sys

input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  p = list(range(n))

  def find(x):
    if p[x] != x:
      p[x] = find(p[x])
    return p[x]

  def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
      p[ra] = rb

  for _ in range(m):
    a, b = map(int, input().split())
    union(a, b)
  print(1 if find(0) == find(n - 1) else 0)

if __name__ == "__main__":
  main()
```

입력

```
3 2
0 1
1 2
```

출력

```
1
```
