# priority-queue — JavaScript

내장 없음 — **최소 힙** 직접.

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
    const n = a.length;
    if (n === 0) return undefined;
    const v = a[0];
    a[0] = a.pop();
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
    return v;
  }
  get empty() {
    return this.a.length === 0;
  }
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const nums = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  const h = new MinHeap();
  for (let i = 0; i < n; i++) h.push(nums[i]);
  const out = [];
  while (!h.empty) out.push(String(h.pop()));
  console.log(out.join(' '));
}

main();
```

입력

```
3
3 1 2
```

출력

```
1 2 3
```
