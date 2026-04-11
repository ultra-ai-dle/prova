# two-pointers — Python

**오름차순** 배열에서 합이 `t` 인 두 수 한 쌍 (없으면 `-1`).

```python
import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  t = int(input())
  i, j = 0, n - 1
  while i < j:
    s = a[i] + a[j]
    if s == t:
      print(a[i], a[j])
      return
    if s < t:
      i += 1
    else:
      j -= 1
  print(-1)

if __name__ == "__main__":
  main()
```

입력

```
6
1 2 4 5 7 11
13
```

출력

```
2 11
```
