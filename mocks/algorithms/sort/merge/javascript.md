# merge-sort — JavaScript

```javascript
const fs = require('fs');

function mergeSort(a) {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));
  const right = mergeSort(a.slice(mid));
  let i = 0;
  let j = 0;
  const res = [];
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) res.push(left[i++]);
    else res.push(right[j++]);
  }
  while (i < left.length) res.push(left[i++]);
  while (j < right.length) res.push(right[j++]);
  return res;
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  console.log(mergeSort(a).join(' '));
}

main();
```

입력

```
5
3 1 4 1 2
```

출력

```
1 1 2 3 4
```
