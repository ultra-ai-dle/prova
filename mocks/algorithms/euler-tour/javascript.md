# algorithms/euler-tour — JavaScript

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

const tin = new Array(n).fill(0);
const tout = new Array(n).fill(0);
let timer = 0;

const stack = [[0, -1, false]];
while (stack.length > 0) {
  const [u, parent, leaving] = stack.pop();
  if (leaving) {
    tout[u] = timer++;
  } else {
    tin[u] = timer++;
    stack.push([u, parent, true]);
    for (let i = adj[u].length - 1; i >= 0; i--) {
      const v = adj[u][i];
      if (v !== parent) stack.push([v, u, false]);
    }
  }
}

const result = [];
for (let i = 0; i < n; i++) result.push(`${tin[i]} ${tout[i]}`);
console.log(result.join('\n'));
```

입력

```
5
0 1
0 2
1 3
1 4
```

출력

```
0 9
1 6
7 8
2 3
4 5
```
