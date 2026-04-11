# graph-adjacency-list — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const [n, m] = lines[0].split(' ').map(Number);
const graph = Array.from({ length: n }, () => []);
for (let i = 1; i <= m; i++) {
  const [u, v] = lines[i].split(' ').map(Number);
  graph[u].push(v);
  graph[v].push(u);
}
const u = Number(lines[m + 1]);
console.log(graph[u].sort((a, b) => a - b).join(' '));
```

입력

```
4 4
0 1
0 2
1 3
2 3
0
```

출력

```
1 2
```
