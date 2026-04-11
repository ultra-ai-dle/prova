# heap-sort — Python

**최대 힙** `siftdown` 후 루트를 끝과 교환.

```python
import sys

input = sys.stdin.readline

def siftdown(a, n, i):
  while True:
    c = 2 * i + 1
    if c >= n:
      break
    if c + 1 < n and a[c + 1] > a[c]:
      c += 1
    if a[c] > a[i]:
      a[c], a[i] = a[i], a[c]
      i = c
    else:
      break

def heapsort(a):
  n = len(a)
  for i in range(n // 2 - 1, -1, -1):
    siftdown(a, n, i)
  for end in range(n - 1, 0, -1):
    a[0], a[end] = a[end], a[0]
    siftdown(a, end, 0)

def main():
  n = int(input())
  a = list(map(int, input().split()))
  heapsort(a)
  print(*a)

if __name__ == "__main__":
  main()
```

입력

```
5
3 1 4 1 2
```

출력

```
1 1 2 3 4
```
