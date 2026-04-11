# 펜윅 트리 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = parseInt(lines[idx++]);
const tree = new Array(n + 1).fill(0);

function update(i, val) {
  for (; i <= n; i += i & (-i)) tree[i] += val;
}

function prefixSum(i) {
  let s = 0;
  for (; i > 0; i -= i & (-i)) s += tree[i];
  return s;
}

const q = parseInt(lines[idx++]);
const result = [];
for (let i = 0; i < q; i++) {
  const op = lines[idx++].split(' ');
  if (op[0] === 'update') {
    update(parseInt(op[1]), parseInt(op[2]));
  } else {
    result.push(prefixSum(parseInt(op[1])));
  }
}

console.log(result.join('\n'));
```

입력

```
6
3
update 2 5
update 4 3
query 5
```

출력

```
8
```
