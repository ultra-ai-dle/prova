# Articulation Points — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const [n, m] = lines[idx++].split(' ').map(Number);
const graph = Array.from({ length: n }, () => []);
for (let i = 0; i < m; i++) {
  const [u, v] = lines[idx++].split(' ').map(Number);
  graph[u].push(v);
  graph[v].push(u);
}

const disc = new Array(n).fill(-1);
const low = new Array(n).fill(0);
const isAP = new Array(n).fill(false);
let timer = 0;

for (let start = 0; start < n; start++) {
  if (disc[start] !== -1) continue;
  disc[start] = low[start] = timer++;
  const stack = [[start, -1, 0]];

  while (stack.length) {
    const top = stack[stack.length - 1];
    const [node, par, i] = top;
    if (i < graph[node].length) {
      top[2]++;
      const nb = graph[node][i];
      if (nb === par) continue;
      if (disc[nb] === -1) {
        disc[nb] = low[nb] = timer++;
        stack.push([nb, node, 0]);
      } else {
        low[node] = Math.min(low[node], disc[nb]);
      }
    } else {
      stack.pop();
      if (stack.length) {
        const p = stack[stack.length - 1][0];
        const pp = stack[stack.length - 1][1];
        low[p] = Math.min(low[p], low[node]);
        if (pp === -1) {
          const rootChildren = graph[p].filter(nb => disc[nb] > disc[p]).length;
          if (rootChildren >= 2) isAP[p] = true;
        } else if (low[node] >= disc[p]) {
          isAP[p] = true;
        }
      }
    }
  }
}

const result = [];
for (let i = 0; i < n; i++) if (isAP[i]) result.push(i);
console.log(result.join('\n'));
```

입력

```
5 5
0 1
1 2
2 0
1 3
3 4
```

출력

```
1
3
```
