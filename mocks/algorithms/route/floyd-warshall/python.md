# floyd-warshall — Python

```python
import sys

input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  INF = 10**9
  d = [[INF] * n for _ in range(n)]
  for i in range(n):
    d[i][i] = 0
  for _ in range(m):
    u, v, w = map(int, input().split())
    d[u][v] = min(d[u][v], w)
  for k in range(n):
    for i in range(n):
      for j in range(n):
        if d[i][k] != INF and d[k][j] != INF:
          d[i][j] = min(d[i][j], d[i][k] + d[k][j])
  for row in d:
    print(*["INF" if x == INF else x for x in row])

if __name__ == "__main__":
  main()
```

입력

```
4 5
0 1 3
0 3 7
1 2 2
2 3 1
3 0 6
```

출력

```
0 3 5 6
INF 0 2 3
INF INF 0 1
6 9 11 0
```
