# floyd-warshall — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, m] = lines[i++].split(/\s+/).map(Number);
  const INF = 1e9;
  const d = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (r === c ? 0 : INF))
  );
  for (let k = 0; k < m; k++) {
    const [u, v, w] = lines[i++].split(/\s+/).map(Number);
    if (w < d[u][v]) d[u][v] = w;
  }
  for (let k = 0; k < n; k++) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (d[r][k] !== INF && d[k][c] !== INF && d[r][k] + d[k][c] < d[r][c]) {
          d[r][c] = d[r][k] + d[k][c];
        }
      }
    }
  }
  const out = d.map(row => row.map(x => x === INF ? "INF" : x).join(' ')).join('\n');
  console.log(out);
}

main();
```

입력

```
4 5
0 1 3
0 3 7
1 2 2
2 3 1
3 0 6
```

출력

```
0 3 5 6
INF 0 2 3
INF INF 0 1
6 9 11 0
```
