# algorithms/sort/counting — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = parseInt(lines[0]);
const arr = lines[1].split(' ').map(Number);

const count = new Array(101).fill(0);
for (const x of arr) count[x]++;

const result = [];
for (let i = 0; i <= 100; i++) {
  for (let j = 0; j < count[i]; j++) result.push(i);
}

console.log(result.join(' '));
```

입력

```
7
4 2 2 8 3 3 1
```

출력

```
1 2 2 3 3 4 8
```
