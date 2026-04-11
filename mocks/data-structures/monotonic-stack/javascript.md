# monotonic-stack — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = Number(lines[0]);
const arr = lines[1].split(' ').map(Number);
const result = new Array(n).fill(-1);
const stack = [];
for (let i = 0; i < n; i++) {
  while (stack.length && arr[stack[stack.length - 1]] < arr[i]) {
    result[stack.pop()] = i;
  }
  stack.push(i);
}
console.log(result.join(' '));
```

입력

```
6
2 1 5 6 2 3
```

출력

```
2 2 3 -1 5 -1
```
