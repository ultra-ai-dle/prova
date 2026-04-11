# union-find — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, m] = lines[i++].split(/\s+/).map(Number);
  const p = Array.from({ length: n }, (_, k) => k);
  function find(x) {
    if (p[x] !== x) p[x] = find(p[x]);
    return p[x];
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) p[ra] = rb;
  }
  for (let k = 0; k < m; k++) {
    const [a, b] = lines[i++].split(/\s+/).map(Number);
    union(a, b);
  }
  console.log(find(0) === find(n - 1) ? 1 : 0);
}

main();
```

입력

```
3 2
0 1
1 2
```

출력

```
1
```
