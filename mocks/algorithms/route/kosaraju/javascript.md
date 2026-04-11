# Kosaraju — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const [n, m] = lines[idx++].split(' ').map(Number);
const graph = Array.from({ length: n }, () => []);
const rev = Array.from({ length: n }, () => []);
for (let i = 0; i < m; i++) {
  const [u, v] = lines[idx++].split(' ').map(Number);
  graph[u].push(v);
  rev[v].push(u);
}

const visited = new Array(n).fill(false);
const order = [];

for (let i = 0; i < n; i++) {
  if (!visited[i]) {
    const stack = [[i, 0]];
    while (stack.length) {
      const [node, phase] = stack.pop();
      if (phase === 0) {
        if (visited[node]) continue;
        visited[node] = true;
        stack.push([node, 1]);
        for (const nb of graph[node]) {
          if (!visited[nb]) stack.push([nb, 0]);
        }
      } else {
        order.push(node);
      }
    }
  }
}

const visited2 = new Array(n).fill(false);
let sccCount = 0;

for (let i = order.length - 1; i >= 0; i--) {
  const start = order[i];
  if (!visited2[start]) {
    visited2[start] = true;
    const stack = [start];
    while (stack.length) {
      const node = stack.pop();
      for (const nb of rev[node]) {
        if (!visited2[nb]) {
          visited2[nb] = true;
          stack.push(nb);
        }
      }
    }
    sccCount++;
  }
}

console.log(sccCount);
```

입력

```
5 6
0 1
1 2
2 0
1 3
3 4
4 3
```

출력

```
3
```
