# Rabin-Karp — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function rabinKarp(t, p) {
  const BASE = 31n;
  const MOD = 1000000007n;
  const n = t.length, m = p.length;
  if (m > n) return [];
  let pw = 1n;
  for (let i = 0; i < m - 1; i++) pw = pw * BASE % MOD;
  let ph = 0n, th = 0n;
  for (let i = 0; i < m; i++) {
    ph = (ph * BASE + BigInt(p.charCodeAt(i))) % MOD;
    th = (th * BASE + BigInt(t.charCodeAt(i))) % MOD;
  }
  const result = [];
  for (let i = 0; i <= n - m; i++) {
    if (th === ph && t.slice(i, i + m) === p) result.push(i);
    if (i < n - m) {
      th = (th - BigInt(t.charCodeAt(i)) * pw % MOD + MOD) % MOD;
      th = (th * BASE + BigInt(t.charCodeAt(i + m))) % MOD;
    }
  }
  return result;
}

const t = lines[0];
const p = lines[1];
const ans = rabinKarp(t, p);
console.log(ans.length ? ans.join(' ') : -1);
```

입력

```
GEEKS FOR GEEKS
GEEKS
```

출력

```
0 10
```
