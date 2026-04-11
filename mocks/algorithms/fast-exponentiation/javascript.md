# fast-exponentiation — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function power(a, b, m) {
  let result = 1n;
  a = BigInt(a) % BigInt(m);
  b = BigInt(b);
  m = BigInt(m);
  while (b > 0n) {
    if (b & 1n) result = result * a % m;
    a = a * a % m;
    b >>= 1n;
  }
  return result;
}

const [a, b, m] = lines[0].split(' ').map(Number);
console.log(String(power(a, b, m)));
```

입력

```
2 10 1000000007
```

출력

```
1024
```
