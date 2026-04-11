# difference-array — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const [n, q] = lines[0].split(' ').map(Number);
const diff = new Array(n + 1).fill(0);
for (let i = 1; i <= q; i++) {
  const [l, r, v] = lines[i].split(' ').map(Number);
  diff[l] += v;
  if (r + 1 <= n) diff[r + 1] -= v;
}

const arr = new Array(n).fill(0);
arr[0] = diff[0];
for (let i = 1; i < n; i++) arr[i] = arr[i - 1] + diff[i];

console.log(arr.join(' '));
```

입력

```
6 3
1 3 2
2 5 3
0 1 4
```

출력

```
4 6 5 5 3 0
```
