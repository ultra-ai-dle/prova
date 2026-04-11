# LRU Cache — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.cap) {
      this.cache.delete(this.cache.keys().next().value);
    }
  }
}

let idx = 0;
const capacity = Number(lines[idx++]);
const q = Number(lines[idx++]);
const lru = new LRUCache(capacity);
const results = [];
for (let i = 0; i < q; i++) {
  const op = lines[idx++].split(' ');
  if (op[0] === 'get') {
    results.push(lru.get(Number(op[1])));
  } else {
    lru.put(Number(op[1]), Number(op[2]));
  }
}
console.log(results.join('\n'));
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
