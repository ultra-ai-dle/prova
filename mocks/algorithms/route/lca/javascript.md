# LCA — JavaScript

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

const depth = new Array(n).fill(-1);
const parent = new Array(n).fill(-1);
depth[0] = 0;
const stack = [0];
while (stack.length) {
  const node = stack.pop();
  for (const nb of graph[node]) {
    if (depth[nb] === -1) {
      depth[nb] = depth[node] + 1;
      parent[nb] = node;
      stack.push(nb);
    }
  }
}

function lca(u, v) {
  while (depth[u] > depth[v]) u = parent[u];
  while (depth[v] > depth[u]) v = parent[v];
  while (u !== v) { u = parent[u]; v = parent[v]; }
  return u;
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
