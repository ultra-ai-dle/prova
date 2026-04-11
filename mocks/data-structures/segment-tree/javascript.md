# 구간 합 세그먼트 트리 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = parseInt(lines[idx++]);
const arr = lines[idx++].split(' ').map(Number);
const tree = new Array(4 * n).fill(0);

function build(node, start, end) {
  if (start === end) {
    tree[node] = arr[start];
  } else {
    const mid = (start + end) >> 1;
    build(2*node, start, mid);
    build(2*node+1, mid+1, end);
    tree[node] = tree[2*node] + tree[2*node+1];
  }
}

function update(node, start, end, i, val) {
  if (start === end) {
    arr[i] = val;
    tree[node] = val;
  } else {
    const mid = (start + end) >> 1;
    if (i <= mid) update(2*node, start, mid, i, val);
    else update(2*node+1, mid+1, end, i, val);
    tree[node] = tree[2*node] + tree[2*node+1];
  }
}

function query(node, start, end, l, r) {
  if (r < start || end < l) return 0;
  if (l <= start && end <= r) return tree[node];
  const mid = (start + end) >> 1;
  return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r);
}

build(1, 0, n-1);

const q = parseInt(lines[idx++]);
const result = [];
for (let i = 0; i < q; i++) {
  const op = lines[idx++].split(' ');
  if (op[0] === 'update') {
    update(1, 0, n-1, parseInt(op[1]), parseInt(op[2]));
  } else {
    result.push(query(1, 0, n-1, parseInt(op[1]), parseInt(op[2])));
  }
}

console.log(result.join('\n'));
```

입력

```
5
1 2 3 4 5
3
update 1 10
query 0 3
query 2 4
```

출력

```
17
12
```
