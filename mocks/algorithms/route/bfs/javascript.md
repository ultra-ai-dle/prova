# bfs — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, m, st] = lines[i++].split(/\s+/).map(Number);
  const g = Array.from({ length: n }, () => []);
  for (let k = 0; k < m; k++) {
    const [a, b] = lines[i++].split(/\s+/).map(Number);
    g[a].push(b);
    g[b].push(a);
  }
  for (const row of g) row.sort((x, y) => x - y);
  const seen = Array(n).fill(false);
  const q = [st];
  seen[st] = true;
  const out = [];
  while (q.length) {
    const u = q.shift();
    out.push(u);
    for (const v of g[u]) {
      if (!seen[v]) {
        seen[v] = true;
        q.push(v);
      }
    }
  }
  console.log(out.join(' '));
}

main();
```

입력

```
3 3 0
0 1
0 2
1 2
```

출력

```
0 1 2
```
