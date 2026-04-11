# Bitmask DP — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = Number(lines[idx++]);
const dist = [];
for (let i = 0; i < n; i++) {
  dist.push(lines[idx++].split(' ').map(Number));
}

const INF = 1e9;
const size = 1 << n;
const dp = Array.from({ length: size }, () => new Array(n).fill(INF));
dp[1][0] = 0;

for (let mask = 0; mask < size; mask++) {
  for (let u = 0; u < n; u++) {
    if (dp[mask][u] === INF) continue;
    if (!((mask >> u) & 1)) continue;
    for (let v = 0; v < n; v++) {
      if ((mask >> v) & 1) continue;
      const nmask = mask | (1 << v);
      const cost = dp[mask][u] + dist[u][v];
      if (cost < dp[nmask][v]) dp[nmask][v] = cost;
    }
  }
}

const full = size - 1;
let ans = INF;
for (let u = 1; u < n; u++) {
  ans = Math.min(ans, dp[full][u] + dist[u][0]);
}
console.log(ans);
```

입력

```
4
0 10 15 20
5 0 9 10
6 13 0 12
8 8 9 0
```

출력

```
35
```
