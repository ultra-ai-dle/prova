# bucket-sort — JavaScript

```javascript
const fs = require('fs');

function insertionSort(b) {
  for (let i = 1; i < b.length; i++) {
    const key = b[i];
    let j = i - 1;
    while (j >= 0 && b[j] > key) {
      b[j + 1] = b[j];
      j--;
    }
    b[j + 1] = key;
  }
}

function bucketSort(a, k = 10) {
  const buckets = Array.from({ length: k }, () => []);
  for (const v of a) buckets[Math.floor((v * k) / 1000)].push(v);
  for (const b of buckets) insertionSort(b);
  return buckets.flat();
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  console.log(bucketSort(a).join(' '));
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
