# ternary-search — JavaScript

```javascript
const fs = require('fs');

function ternarySearch(a) {
  let lo = 0;
  let hi = a.length - 1;
  while (hi - lo > 2) {
    const m1 = lo + Math.floor((hi - lo) / 3);
    const m2 = hi - Math.floor((hi - lo) / 3);
    if (a[m1] < a[m2]) lo = m1;
    else hi = m2;
  }
  let idx = lo;
  for (let i = lo + 1; i <= hi; i++) {
    if (a[i] > a[idx]) idx = i;
  }
  return idx;
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  console.log(ternarySearch(a));
}

main();
```

입력

```
9
1 3 6 7 9 8 5 2 1
```

출력

```
4
```
