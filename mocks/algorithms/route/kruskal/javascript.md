# kruskal — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, m] = lines[i++].split(/\s+/).map(Number);
  const edges = [];
  for (let k = 0; k < m; k++) {
    const [u, v, w] = lines[i++].split(/\s+/).map(Number);
    edges.push([w, u, v]);
  }
  edges.sort((a, b) => a[0] - b[0]);
  const p = Array.from({ length: n }, (_, k) => k);
  function find(x) {
    if (p[x] !== x) p[x] = find(p[x]);
    return p[x];
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    p[ra] = rb;
    return true;
  }
  let total = 0;
  for (const [w, u, v] of edges) {
    if (union(u, v)) total += w;
  }
  console.log(total);
}

main();
```

입력

```
3 3
0 1 1
1 2 2
0 2 3
```

출력

```
3
```
