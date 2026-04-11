# shell-sort — JavaScript

```javascript
const fs = require('fs');

function shellSort(a) {
  const n = a.length;
  let gap = 1;
  while (gap < Math.floor(n / 3)) gap = gap * 3 + 1;
  while (gap >= 1) {
    for (let i = gap; i < n; i++) {
      const key = a[i];
      let j = i - gap;
      while (j >= 0 && a[j] > key) {
        a[j + gap] = a[j];
        j -= gap;
      }
      a[j + gap] = key;
    }
    gap = Math.floor(gap / 3);
  }
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  shellSort(a);
  console.log(a.join(' '));
}

main();
```

입력

```
7
64 25 12 22 11 90 45
```

출력

```
11 12 22 25 45 64 90
```
