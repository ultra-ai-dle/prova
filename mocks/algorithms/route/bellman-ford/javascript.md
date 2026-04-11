# bellman-ford — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, m, s] = lines[i++].split(/\s+/).map(Number);
  const edges = [];
  for (let k = 0; k < m; k++) {
    const [u, v, w] = lines[i++].split(/\s+/).map(Number);
    edges.push([u, v, w]);
  }
  const INF = 1e9;
  const d = Array(n).fill(INF);
  d[s] = 0;
  for (let iter = 0; iter < n - 1; iter++) {
    for (const [u, v, w] of edges) {
      if (d[u] !== INF && d[u] + w < d[v]) {
        d[v] = d[u] + w;
      }
    }
  }
  for (const [u, v, w] of edges) {
    if (d[u] !== INF && d[u] + w < d[v]) {
      console.log("NEGATIVE CYCLE");
      return;
    }
  }
  console.log(d.map(x => x === INF ? "INF" : x).join(' '));
}

main();
```

입력

```
5 7 0
0 1 6
0 2 7
1 2 8
1 3 5
1 4 -4
2 4 9
3 1 -2
```

출력

```
0 2 7 4 -2
```
