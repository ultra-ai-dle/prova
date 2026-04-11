# stack — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const q = parseInt(lines[i++], 10);
  const s = [];
  const out = [];
  for (let k = 0; k < q; k++) {
    const parts = lines[i++].trim().split(/\s+/);
    if (parts[0] === 'push') {
      s.push(parseInt(parts[1], 10));
    } else {
      out.push(String(s.pop()));
    }
  }
  console.log(out.join('\n'));
}

main();
```

입력

```
6
push 1
push 2
pop
push 3
pop
pop
```

출력

```
2
3
1
```
