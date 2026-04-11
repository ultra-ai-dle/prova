# hash-table — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const q = parseInt(lines[i++], 10);
  const d = Object.create(null);
  const out = [];
  for (let k = 0; k < q; k++) {
    const parts = lines[i++].trim().split(/\s+/);
    if (parts[0] === 'set') {
      d[parts[1]] = parseInt(parts[2], 10);
    } else {
      out.push(String(d[parts[1]] ?? 0));
    }
  }
  console.log(out.join('\n'));
}

main();
```

입력

```
6
set a 10
get a
set b 20
get b
set a 30
get a
```

출력

```
10
20
30
```
