# deque — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  let i = 0;
  const q = parseInt(lines[i++], 10);
  const d = [];
  const out = [];
  for (let k = 0; k < q; k++) {
    const parts = lines[i++].trim().split(/\s+/);
    const op = parts[0];
    if (op === 'push_front') {
      d.unshift(parseInt(parts[1], 10));
    } else if (op === 'push_back') {
      d.push(parseInt(parts[1], 10));
    } else if (op === 'pop_front') {
      out.push(String(d.shift()));
    } else {
      out.push(String(d.pop()));
    }
  }
  console.log(out.join('\n'));
}

main();
```

입력

```
6
push_back 1
push_back 2
push_front 0
pop_front
pop_back
pop_front
```

출력

```
0
2
1
```
