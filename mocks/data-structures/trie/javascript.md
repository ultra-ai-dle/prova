# trie — JavaScript

```javascript
const fs = require('fs');

function insert(root, s) {
  root.cnt++;
  for (const c of s) {
    if (!root.nxt.has(c)) root.nxt.set(c, { nxt: new Map(), cnt: 0 });
    root = root.nxt.get(c);
    root.cnt++;
  }
}

function countPref(root, s) {
  for (const c of s) {
    if (!root.nxt.has(c)) return 0;
    root = root.nxt.get(c);
  }
  return root.cnt;
}

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const q = parseInt(lines[i++], 10);
  const root = { nxt: new Map(), cnt: 0 };
  const out = [];
  for (let k = 0; k < q; k++) {
    const parts = lines[i++].trim().split(/\s+/);
    if (parts[0] === 'insert') {
      insert(root, parts[1]);
    } else {
      out.push(String(countPref(root, parts[1])));
    }
  }
  console.log(out.join('\n'));
}

main();
```

입력

```
7
insert app
insert apple
insert appetite
count app
count ple
count apx
count z
```

출력

```
3
0
0
0
```
