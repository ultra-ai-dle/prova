# Rolling Hash — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const BASE = 31n;
const MOD = 1000000007n;

const s = lines[0];
const k = parseInt(lines[1]);
const n = s.length;

const pw = new Array(k + 1).fill(0n);
pw[0] = 1n;
for (let i = 1; i <= k; i++) pw[i] = pw[i - 1] * BASE % MOD;

let h = 0n;
for (let i = 0; i < k; i++) {
  h = (h * BASE + BigInt(s.charCodeAt(i) - 96)) % MOD;
}

const result = [h];
for (let i = 1; i <= n - k; i++) {
  h = (h - BigInt(s.charCodeAt(i - 1) - 96) * pw[k - 1] % MOD + MOD) % MOD;
  h = (h * BASE + BigInt(s.charCodeAt(i + k - 1) - 96)) % MOD;
  result.push(h);
}

console.log(result.map(String).join(' '));
```

입력

```
abcde
3
```

출력

```
1026 2019 3012
```
