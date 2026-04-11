# 구간 최솟값 쿼리 (스파스 테이블) — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = parseInt(lines[idx++]);
const arr = lines[idx++].split(' ').map(Number);

const LOG = Math.max(1, Math.floor(Math.log2(n)) + 1);
const sparse = Array.from({ length: LOG }, () => new Array(n).fill(Infinity));
sparse[0] = arr.slice();

for (let j = 1; j < LOG; j++) {
  for (let i = 0; i + (1 << j) <= n; i++) {
    sparse[j][i] = Math.min(sparse[j-1][i], sparse[j-1][i + (1 << (j-1))]);
  }
}

function query(l, r) {
  const k = Math.floor(Math.log2(r - l + 1));
  return Math.min(sparse[k][l], sparse[k][r - (1 << k) + 1]);
}

const q = parseInt(lines[idx++]);
const result = [];
for (let i = 0; i < q; i++) {
  const [l, r] = lines[idx++].split(' ').map(Number);
  result.push(query(l, r));
}

console.log(result.join('\n'));
```

입력

```
7
2 4 3 1 6 7 8
3
1 5
0 6
2 4
```

출력

```
1
1
1
```
