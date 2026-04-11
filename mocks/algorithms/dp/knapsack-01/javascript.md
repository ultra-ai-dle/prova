# Knapsack 0-1 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const [n, W] = lines[0].split(' ').map(Number);
const dp = new Array(W + 1).fill(0);
for (let i = 1; i <= n; i++) {
  const [w, v] = lines[i].split(' ').map(Number);
  for (let c = W; c >= w; c--) {
    dp[c] = Math.max(dp[c], dp[c - w] + v);
  }
}
console.log(dp[W]);
```

입력

```
4 5
2 3
3 4
4 5
5 6
```

출력

```
7
```
