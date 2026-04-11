# merge-sort — Python

```python
import sys

input = sys.stdin.readline

def merge_sort(a):
  if len(a) <= 1:
    return a
  mid = len(a) // 2
  left = merge_sort(a[:mid])
  right = merge_sort(a[mid:])
  i = j = 0
  res = []
  while i < len(left) and j < len(right):
    if left[i] <= right[j]:
      res.append(left[i])
      i += 1
    else:
      res.append(right[j])
      j += 1
  res.extend(left[i:])
  res.extend(right[j:])
  return res

def main():
  n = int(input())
  a = list(map(int, input().split()))
  print(*merge_sort(a))

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
