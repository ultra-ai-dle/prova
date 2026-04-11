# algorithms/dp/knapsack-unbounded — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const [n, W] = lines[0].split(' ').map(Number);
const items = [];
for (let i = 1; i <= n; i++) {
  const [w, v] = lines[i].split(' ').map(Number);
  items.push([w, v]);
}

const dp = new Array(W + 1).fill(0);
for (let c = 1; c <= W; c++) {
  for (const [w, v] of items) {
    if (w <= c) {
      dp[c] = Math.max(dp[c], dp[c - w] + v);
    }
  }
}

console.log(dp[W]);
```

입력

```
4 8
2 3
3 4
4 5
5 6
```

출력

```
12
```
