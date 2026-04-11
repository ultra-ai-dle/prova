# heap-sort — JavaScript

```javascript
const fs = require('fs');

function siftdown(a, n, i) {
  for (;;) {
    let c = 2 * i + 1;
    if (c >= n) break;
    if (c + 1 < n && a[c + 1] > a[c]) c++;
    if (a[c] > a[i]) {
      [a[c], a[i]] = [a[i], a[c]];
      i = c;
    } else break;
  }
}

function heapsort(a) {
  const n = a.length;
  for (let i = (n >> 1) - 1; i >= 0; i--) siftdown(a, n, i);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    siftdown(a, end, 0);
  }
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  heapsort(a);
  console.log(a.join(' '));
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
