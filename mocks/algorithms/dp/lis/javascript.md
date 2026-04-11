# LIS — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const arr = lines[1].split(' ').map(Number);
const tails = [];

function bisectLeft(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

for (const x of arr) {
  const pos = bisectLeft(tails, x);
  if (pos === tails.length) tails.push(x);
  else tails[pos] = x;
}
console.log(tails.length);
```

입력

```
8
3 1 4 1 5 9 2 6
```

출력

```
4
```
