# gcd — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

const [a, b] = lines[0].split(' ').map(Number);
const g = gcd(a, b);
const lcm = a / g * b;
console.log(g, lcm);
```

입력

```
48 18
```

출력

```
6 144
```
