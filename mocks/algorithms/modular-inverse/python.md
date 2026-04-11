# 모듈러 역원 — Python

```python
import sys
input = sys.stdin.readline

a, m = map(int, input().split())
print(pow(a, m - 2, m))
```

입력

```
3 7
```

출력

```
5
```
