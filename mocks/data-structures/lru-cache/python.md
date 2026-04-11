# LRU Cache — Python

```python
import sys
input = sys.stdin.readline
from collections import OrderedDict

class LRUCache:
  def __init__(self, capacity):
    self.cap = capacity
    self.cache = OrderedDict()

  def get(self, key):
    if key not in self.cache:
      return -1
    self.cache.move_to_end(key)
    return self.cache[key]

  def put(self, key, value):
    if key in self.cache:
      self.cache.move_to_end(key)
    self.cache[key] = value
    if len(self.cache) > self.cap:
      self.cache.popitem(last=False)

capacity = int(input())
q = int(input())
lru = LRUCache(capacity)
results = []
for _ in range(q):
  op = input().split()
  if op[0] == 'get':
    results.append(lru.get(int(op[1])))
  else:
    lru.put(int(op[1]), int(op[2]))
print('\n'.join(map(str, results)))
```

입력

```
2
5
put 1 1
put 2 2
get 1
put 3 3
get 2
```

출력

```
1
-1
```
