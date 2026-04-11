# lower-bound — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function lowerBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const n = parseInt(lines[0]);
const arr = lines[1].split(' ').map(Number);
const target = parseInt(lines[2]);
console.log(lowerBound(arr, target));
```

입력

```
7
1 2 4 4 5 7 9
4
```

출력

```
2
```
