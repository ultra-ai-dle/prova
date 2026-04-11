# prefix-sum — Python

`ps[i]` = `a[0..i-1]` 합. 구간 `[l, r]` 은 **1-based** 닫힌 구간.

```python
import sys

input = sys.stdin.readline

def main():
  n = int(input())
  a = list(map(int, input().split()))
  ps = [0] * (n + 1)
  for i in range(n):
    ps[i + 1] = ps[i] + a[i]
  q = int(input())
  out = []
  for _ in range(q):
    l, r = map(int, input().split())
    out.append(str(ps[r] - ps[l - 1]))
  sys.stdout.write("\n".join(out))

if __name__ == "__main__":
  main()
```

입력

```
5
2 1 3 0 4
1
1 3
```

출력

```
6
```
