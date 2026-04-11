# 무방향 그래프 인접 행렬 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const [n, m] = lines[idx++].split(' ').map(Number);
const mat = Array.from({ length: n }, () => new Array(n).fill(0));

for (let i = 0; i < m; i++) {
  const [u, v] = lines[idx++].split(' ').map(Number);
  mat[u][v] = 1;
  mat[v][u] = 1;
}

const result = mat.map(row => row.join(' ')).join('\n');
console.log(result);
```

입력

```
4 4
0 1
0 2
1 3
2 3
```

출력

```
0 1 1 0
1 0 0 1
1 0 0 1
0 1 1 0
```
