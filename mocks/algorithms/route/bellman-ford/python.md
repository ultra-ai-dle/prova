# bellman-ford — Python

```python
import sys

input = sys.stdin.readline

def main():
  n, m, s = map(int, input().split())
  edges = []
  for _ in range(m):
    u, v, w = map(int, input().split())
    edges.append((u, v, w))
  INF = 10**9
  d = [INF] * n
  d[s] = 0
  for i in range(n - 1):
    for u, v, w in edges:
      if d[u] != INF and d[u] + w < d[v]:
        d[v] = d[u] + w
  for u, v, w in edges:
    if d[u] != INF and d[u] + w < d[v]:
      print("NEGATIVE CYCLE")
      return
  print(*["INF" if x == INF else x for x in d])

if __name__ == "__main__":
  main()
```

입력

```
5 7 0
0 1 6
0 2 7
1 2 8
1 3 5
1 4 -4
2 4 9
3 1 -2
```

출력

```
0 2 7 4 -2
```
