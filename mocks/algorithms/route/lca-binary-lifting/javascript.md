# LCA (Binary Lifting) — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = parseInt(lines[idx++]);
const graph = Array.from({ length: n }, () => []);
for (let i = 0; i < n - 1; i++) {
  const [u, v] = lines[idx++].split(' ').map(Number);
  graph[u].push(v);
  graph[v].push(u);
}

const LOG = Math.max(1, Math.ceil(Math.log2(n + 1)));
const depth = new Array(n).fill(-1);
const up = Array.from({ length: LOG }, () => new Array(n).fill(-1));

depth[0] = 0;
up[0][0] = 0;
const stack = [0];
while (stack.length) {
  const node = stack.pop();
  for (const nb of graph[node]) {
    if (depth[nb] === -1) {
      depth[nb] = depth[node] + 1;
      up[0][nb] = node;
      stack.push(nb);
    }
  }
}

for (let k = 1; k < LOG; k++) {
  for (let v = 0; v < n; v++) {
    if (up[k-1][v] !== -1) up[k][v] = up[k-1][up[k-1][v]];
  }
}

function lca(u, v) {
  if (depth[u] < depth[v]) [u, v] = [v, u];
  let diff = depth[u] - depth[v];
  for (let k = 0; k < LOG; k++) if ((diff >> k) & 1) u = up[k][u];
  if (u === v) return u;
  for (let k = LOG - 1; k >= 0; k--) {
    if (up[k][u] !== up[k][v]) { u = up[k][u]; v = up[k][v]; }
  }
  return up[0][u];
}

const q = parseInt(lines[idx++]);
const out = [];
for (let i = 0; i < q; i++) {
  const [u, v] = lines[idx++].split(' ').map(Number);
  out.push(lca(u, v));
}
console.log(out.join('\n'));
```

입력

```
7
0 1
0 2
1 3
1 4
2 5
2 6
3
3 4
5 6
3 5
```

출력

```
1
2
0
```
