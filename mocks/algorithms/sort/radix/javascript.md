# radix-sort — JavaScript

```javascript
const fs = require('fs');

function radixSort(a) {
  let exp = 1;
  while (Math.max(...a) / exp >= 1) {
    const buckets = Array.from({ length: 10 }, () => []);
    for (const v of a) buckets[Math.floor(v / exp) % 10].push(v);
    a = buckets.flat();
    exp *= 10;
  }
  return a;
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  console.log(radixSort(a).join(' '));
}

main();
```

입력

```
6
170 45 75 90 802 24
```

출력

```
24 45 75 90 170 802
```
