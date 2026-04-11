# binary-search — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  const x = parseInt(lines[2], 10);
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  console.log(lo);
}

main();
```

입력

```
6
1 3 5 7 9 11
6
```

출력

```
3
```
