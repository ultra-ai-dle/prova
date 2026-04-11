# Tree Diameter — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = Number(lines[idx++]);
const graph = Array.from({ length: n }, () => []);
for (let i = 0; i < n - 1; i++) {
  const [u, v, w] = lines[idx++].split(' ').map(Number);
  graph[u].push([v, w]);
  graph[v].push([u, w]);
}

function bfs(start) {
  const dist = new Array(n).fill(-1);
  dist[start] = 0;
  const queue = [start];
  let qi = 0;
  while (qi < queue.length) {
    const u = queue[qi++];
    for (const [v, w] of graph[u]) {
      if (dist[v] === -1) {
        dist[v] = dist[u] + w;
        queue.push(v);
      }
    }
  }
  let far = 0;
  for (let i = 1; i < n; i++) if (dist[i] > dist[far]) far = i;
  return [far, dist[far]];
}

const [far1] = bfs(0);
const [, diameter] = bfs(far1);
console.log(diameter);
```

입력

```
5
0 1 2
1 2 3
2 3 1
1 4 5
```

출력

```
9
```
