# algorithms/range-query — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = parseInt(lines[idx++]);
const arr = lines[idx++].split(' ').map(Number);
const tree = new Array(4 * n).fill(Infinity);

function build(node, start, end) {
  if (start === end) {
    tree[node] = arr[start];
    return;
  }
  const mid = (start + end) >> 1;
  build(2 * node, start, mid);
  build(2 * node + 1, mid + 1, end);
  tree[node] = Math.min(tree[2 * node], tree[2 * node + 1]);
}

function query(node, start, end, l, r) {
  if (r < start || end < l) return Infinity;
  if (l <= start && end <= r) return tree[node];
  const mid = (start + end) >> 1;
  return Math.min(
    query(2 * node, start, mid, l, r),
    query(2 * node + 1, mid + 1, end, l, r)
  );
}

build(1, 0, n - 1);
const q = parseInt(lines[idx++]);
const result = [];
for (let i = 0; i < q; i++) {
  const [l, r] = lines[idx++].split(' ').map(Number);
  result.push(query(1, 0, n - 1, l, r));
}
console.log(result.join('\n'));
```

입력

```
8
2 4 3 1 6 7 8 5
3
1 5
0 7
3 6
```

출력

```
1
1
1
```
