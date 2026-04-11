# prime-sieve — Python

```python
import sys
input = sys.stdin.readline

n = int(input())
sieve = [True] * (n + 1)
sieve[0] = sieve[1] = False
i = 2
while i * i <= n:
  if sieve[i]:
    for j in range(i * i, n + 1, i):
      sieve[j] = False
  i += 1

print(*[i for i in range(2, n + 1) if sieve[i]])
```

입력

```
30
```

출력

```
2 3 5 7 11 13 17 19 23 29
```
