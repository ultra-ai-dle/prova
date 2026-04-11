# binary-tree — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = Number(lines[0]);
const vals = lines[1].split(' ').map(Number);

const nodes = vals.map(v => v === -1 ? null : { val: v, left: null, right: null });
for (let i = 0; i < n; i++) {
  if (!nodes[i]) continue;
  const l = 2 * i + 1, r = 2 * i + 2;
  if (l < n && nodes[l]) nodes[i].left = nodes[l];
  if (r < n && nodes[r]) nodes[i].right = nodes[r];
}
const root = nodes[0];

const pre = [], ino = [], post = [];

function preorder(node) {
  if (!node) return;
  pre.push(node.val);
  preorder(node.left);
  preorder(node.right);
}
function inorder(node) {
  if (!node) return;
  inorder(node.left);
  ino.push(node.val);
  inorder(node.right);
}
function postorder(node) {
  if (!node) return;
  postorder(node.left);
  postorder(node.right);
  post.push(node.val);
}

preorder(root);
inorder(root);
postorder(root);
console.log(pre.join(' '));
console.log(ino.join(' '));
console.log(post.join(' '));
```

입력

```
7
1 2 3 4 5 6 7
```

출력

```
1 2 4 5 3 6 7
4 2 5 1 6 3 7
4 5 2 6 7 3 1
```
