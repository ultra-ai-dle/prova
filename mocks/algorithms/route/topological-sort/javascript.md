# topological-sort — JavaScript

```javascript
const fs = require('fs');

class MinHeap {
  constructor() {
    this.a = [];
  }
  push(x) {
    this.a.push(x);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p] <= this.a[i]) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop();
    if (a.length === 0) return top;
    a[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < a.length && a[l] < a[m]) m = l;
      if (r < a.length && a[r] < a[m]) m = r;
      if (m === i) break;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
    }
    return top;
  }
  get empty() {
    return this.a.length === 0;
  }
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const [n, m] = lines[i++].split(/\s+/).map(Number);
  const g = Array.from({ length: n }, () => []);
  const indeg = Array(n).fill(0);
  for (let k = 0; k < m; k++) {
    const [u, v] = lines[i++].split(/\s+/).map(Number);
    g[u].push(v);
    indeg[v]++;
  }
  for (const row of g) row.sort((x, y) => x - y);
  const q = new MinHeap();
  for (let v = 0; v < n; v++) if (indeg[v] === 0) q.push(v);
  const out = [];
  while (!q.empty) {
    const u = q.pop();
    out.push(u);
    for (const v of g[u]) {
      indeg[v]--;
      if (indeg[v] === 0) q.push(v);
    }
  }
  console.log(out.join(' '));
}

main();
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
0 1 2 3
```
