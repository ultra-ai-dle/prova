# shell-sort — Python

```python
import sys

input = sys.stdin.readline

def shell_sort(a):
  n = len(a)
  gap = 1
  while gap < n // 3:
    gap = gap * 3 + 1
  while gap >= 1:
    for i in range(gap, n):
      key = a[i]
      j = i - gap
      while j >= 0 and a[j] > key:
        a[j + gap] = a[j]
        j -= gap
      a[j + gap] = key
    gap //= 3

def main():
  n = int(input())
  a = list(map(int, input().split()))
  shell_sort(a)
  print(*a)

if __name__ == "__main__":
  main()
```

입력

```
7
64 25 12 22 11 90 45
```

출력

```
11 12 22 25 45 64 90
```
