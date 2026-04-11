# 모듈러 역원 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = result * base % mod;
    exp /= 2n;
    base = base * base % mod;
  }
  return result;
}

const [a, m] = lines[0].split(' ').map(BigInt);
console.log(String(modPow(a, m - 2n, m)));
```

입력

```
3 7
```

출력

```
5
```
