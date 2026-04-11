# quicksort — JavaScript

```javascript
const fs = require('fs');

function partition(a, lo, hi) {
  const p = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] <= p) {
      [a[i], a[j]] = [a[j], a[i]];
      i++;
    }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  return i;
}

function qsort(a, lo, hi) {
  if (lo < hi) {
    const q = partition(a, lo, hi);
    qsort(a, lo, q - 1);
    qsort(a, q + 1, hi);
  }
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  qsort(a, 0, n - 1);
  console.log(a.join(' '));
}

main();
```

입력

```
4
3 1 4 2
```

출력

```
1 2 3 4
```
