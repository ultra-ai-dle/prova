# singly-linked-list — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const vals = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  class Node {
    constructor(v) {
      this.v = v;
      this.nxt = null;
    }
  }
  let head = null;
  for (let i = n - 1; i >= 0; i--) {
    const nd = new Node(vals[i]);
    nd.nxt = head;
    head = nd;
  }
  let prev = null;
  let cur = head;
  while (cur) {
    const nxt = cur.nxt;
    cur.nxt = prev;
    prev = cur;
    cur = nxt;
  }
  const out = [];
  cur = prev;
  while (cur) {
    out.push(String(cur.v));
    cur = cur.nxt;
  }
  console.log(out.join(' '));
}

main();
```

입력

```
5
1 2 3 4 5
```

출력

```
5 4 3 2 1
```
