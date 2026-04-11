# prim — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, m] = lines[i++].split(/\s+/).map(Number);
  const g = Array.from({ length: n }, () => []);
  for (let k = 0; k < m; k++) {
    const [u, v, w] = lines[i++].split(/\s+/).map(Number);
    g[u].push([w, v]);
    g[v].push([w, u]);
  }
  const visited = new Array(n).fill(false);
  let total = 0;
  const pq = [[0, 0]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [cost, u] = pq.shift();
    if (visited[u]) continue;
    visited[u] = true;
    total += cost;
    for (const [w, v] of g[u]) {
      if (!visited[v]) pq.push([w, v]);
    }
  }
  console.log(total);
}

main();
```

입력

```
5 7
0 1 2
0 3 6
1 2 3
1 3 8
1 4 5
2 4 7
3 4 9
```

출력

```
17
```
