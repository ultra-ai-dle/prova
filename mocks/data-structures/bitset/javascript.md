# 정수 집합 비트셋 — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = parseInt(lines[idx++]);
const bits = new Array(n).fill(0);

const q = parseInt(lines[idx++]);
const result = [];
for (let i = 0; i < q; i++) {
  const op = lines[idx++].split(' ');
  if (op[0] === 'set') {
    bits[parseInt(op[1])] = 1;
  } else if (op[0] === 'clear') {
    bits[parseInt(op[1])] = 0;
  } else if (op[0] === 'flip') {
    bits[parseInt(op[1])] ^= 1;
  } else if (op[0] === 'get') {
    result.push(bits[parseInt(op[1])]);
  } else if (op[0] === 'count') {
    result.push(bits.reduce((acc, v) => acc + v, 0));
  }
}

console.log(result.join('\n'));
```

입력

```
64
5
set 3
set 7
flip 3
get 3
count
```

출력

```
0
1
```
