# graph-adjacency-list — Python

```python
import sys
input = sys.stdin.readline

def main():
  n, m = map(int, input().split())
  graph = [[] for _ in range(n)]
  for _ in range(m):
    u, v = map(int, input().split())
    graph[u].append(v)
    graph[v].append(u)
  u = int(input())
  print(*sorted(graph[u]))

main()
```

입력

```
4 4
0 1
0 2
1 3
2 3
0
```

출력

```
1 2
```
