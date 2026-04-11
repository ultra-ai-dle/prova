# bst — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

class Node {
  constructor(v) { this.v = v; this.left = null; this.right = null; }
}

function insert(root, v) {
  if (!root) return new Node(v);
  if (v < root.v) root.left = insert(root.left, v);
  else if (v > root.v) root.right = insert(root.right, v);
  return root;
}

function search(root, v) {
  if (!root) return 0;
  if (v === root.v) return 1;
  return v < root.v ? search(root.left, v) : search(root.right, v);
}

function inorder(root, result) {
  if (!root) return;
  inorder(root.left, result);
  result.push(root.v);
  inorder(root.right, result);
}

const q = Number(lines[0]);
let root = null;
const out = [];
for (let i = 1; i <= q; i++) {
  const parts = lines[i].split(' ');
  if (parts[0] === 'insert') {
    root = insert(root, Number(parts[1]));
  } else if (parts[0] === 'search') {
    out.push(String(search(root, Number(parts[1]))));
  } else if (parts[0] === 'inorder') {
    const result = [];
    inorder(root, result);
    out.push(result.join(' '));
  }
}
console.log(out.join('\n'));
```

입력

```
6
insert 5
insert 3
insert 7
insert 1
search 3
inorder
```

출력

```
1
1 3 5 7
```
