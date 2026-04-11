# kruskal — Python

```python
import sys

input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  edges = []
  for _ in range(m):
    u, v, w = map(int, input().split())
    edges.append((w, u, v))
  edges.sort()
  p = list(range(n))

  def find(x):
    if p[x] != x:
      p[x] = find(p[x])
    return p[x]

  def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb:
      return False
    p[ra] = rb
    return True

  total = 0
  for w, u, v in edges:
    if union(u, v):
      total += w
  print(total)

if __name__ == "__main__":
  main()
```

입력

```
3 3
0 1 1
1 2 2
0 2 3
```

출력

```
3
```
