# 확장 유클리드 알고리즘 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function extendedGcd(a, b) {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x, y] = extendedGcd(b, a % b);
  return [g, y, x - (a / b) * y];
}

const [a, b] = lines[0].split(' ').map(BigInt);
const [g, x, y] = extendedGcd(a, b);
console.log(`${g} ${x} ${y}`);
```

입력

```
35 15
```

출력

```
5 1 -2
```
