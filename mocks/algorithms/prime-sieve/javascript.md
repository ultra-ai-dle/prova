# prime-sieve — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = parseInt(lines[0]);
const sieve = new Array(n + 1).fill(true);
sieve[0] = sieve[1] = false;
for (let i = 2; i * i <= n; i++) {
  if (sieve[i]) {
    for (let j = i * i; j <= n; j += i) sieve[j] = false;
  }
}

const primes = [];
for (let i = 2; i <= n; i++) if (sieve[i]) primes.push(i);
console.log(primes.join(' '));
```

입력

```
30
```

출력

```
2 3 5 7 11 13 17 19 23 29
```
