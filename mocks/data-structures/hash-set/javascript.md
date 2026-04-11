# Hash Set — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const q = parseInt(lines[idx++]);
const s = new Set();
const result = [];

for (let i = 0; i < q; i++) {
  const parts = lines[idx++].split(' ');
  if (parts[0] === 'add') {
    s.add(parseInt(parts[1]));
  } else if (parts[0] === 'remove') {
    s.delete(parseInt(parts[1]));
  } else if (parts[0] === 'contains') {
    result.push(s.has(parseInt(parts[1])) ? 1 : 0);
  } else if (parts[0] === 'size') {
    result.push(s.size);
  }
}

console.log(result.join('\n'));
```

입력

```
6
add 5
add 3
add 5
contains 5
remove 5
contains 5
```

출력

```
1
0
```
