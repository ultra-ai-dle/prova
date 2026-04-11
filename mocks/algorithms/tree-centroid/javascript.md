# algorithms/tree-centroid — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = parseInt(lines[0]);
const adj = Array.from({ length: n }, () => []);
for (let i = 1; i < n; i++) {
  const [u, v] = lines[i].split(' ').map(Number);
  adj[u].push(v);
  adj[v].push(u);
}

const size = new Array(n).fill(1);
const parent = new Array(n).fill(-1);
const order = [];
const stack = [0];
const visited = new Array(n).fill(false);
visited[0] = true;
while (stack.length > 0) {
  const u = stack.pop();
  order.push(u);
  for (const v of adj[u]) {
    if (!visited[v]) {
      visited[v] = true;
      parent[v] = u;
      stack.push(v);
    }
  }
}
for (let i = order.length - 1; i >= 0; i--) {
  const u = order[i];
  if (parent[u] !== -1) size[parent[u]] += size[u];
}

const result = [];
for (let u = 0; u < n; u++) {
  let maxComp = n - size[u];
  for (const v of adj[u]) {
    if (size[v] < size[u]) maxComp = Math.max(maxComp, size[v]);
  }
  if (maxComp <= Math.floor(n / 2)) result.push(u);
}

result.sort((a, b) => a - b);
console.log(result.join('\n'));
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
```

출력

```
0
```
