# 이항 계수 C(n, k) mod 1e9+7 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const MOD = 1000000007n;
const [n, k] = lines[0].split(' ').map(Number);

const dp = Array.from({length: n + 1}, () => new Array(n + 1).fill(0n));
for (let i = 0; i <= n; i++) {
  dp[i][0] = 1n;
  for (let j = 1; j <= i; j++) {
    dp[i][j] = (dp[i-1][j-1] + dp[i-1][j]) % MOD;
  }
}

console.log(String(dp[n][k]));
```

입력

```
10 3
```

출력

```
120
```
