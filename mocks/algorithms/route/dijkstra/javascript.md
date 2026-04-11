# dijkstra — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, s, t, m] = lines[i++].split(/\s+/).map(Number);
  const g = Array.from({ length: n }, () => []);
  for (let k = 0; k < m; k++) {
    const [u, v, w] = lines[i++].split(/\s+/).map(Number);
    g[u].push([v, w]);
  }
  const INF = 1e9;
  const d = Array(n).fill(INF);
  d[s] = 0;
  const pq = [[0, s]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [du, u] = pq.shift();
    if (du !== d[u]) continue;
    for (const [v, w] of g[u]) {
      if (du + w < d[v]) {
        d[v] = du + w;
        pq.push([d[v], v]);
      }
    }
  }
  console.log(d[t]);
}

main();
```

입력

```
3 0 1 3
0 1 4
0 2 1
2 1 2
```

출력

```
3
```
