# Edit Distance — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const a = lines[0];
const b = lines[1];
const m = a.length, n = b.length;
const dp = Array.from({ length: m + 1 }, (_, i) => {
  const row = new Array(n + 1).fill(0);
  row[0] = i;
  return row;
});
for (let j = 0; j <= n; j++) dp[0][j] = j;
for (let i = 1; i <= m; i++) {
  for (let j = 1; j <= n; j++) {
    if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
    else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  }
}
console.log(dp[m][n]);
```

입력

```
kitten
sitting
```

출력

```
3
```
