# Coin Change — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const [k, amount] = lines[0].split(' ').map(Number);
const coins = lines[1].split(' ').map(Number);
const INF = Infinity;
const dp = new Array(amount + 1).fill(INF);
dp[0] = 0;
for (const c of coins) {
  for (let x = c; x <= amount; x++) {
    if (dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
  }
}
console.log(dp[amount] === INF ? -1 : dp[amount]);
```

입력

```
3 11
1 5 6
```

출력

```
2
```
