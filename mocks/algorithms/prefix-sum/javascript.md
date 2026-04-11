# prefix-sum — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const n = parseInt(lines[i++], 10);
  const a = lines[i++].trim().split(/\s+/).map((x) => parseInt(x, 10));
  const ps = new Array(n + 1).fill(0);
  for (let j = 0; j < n; j++) ps[j + 1] = ps[j] + a[j];
  const q = parseInt(lines[i++], 10);
  const out = [];
  for (let k = 0; k < q; k++) {
    const [l, r] = lines[i++].trim().split(/\s+/).map(Number);
    out.push(String(ps[r] - ps[l - 1]));
  }
  console.log(out.join('\n'));
}

main();
```

입력

```
5
2 1 3 0 4
1
1 3
```

출력

```
6
```
