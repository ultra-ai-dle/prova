# Dynamic Array — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const q = parseInt(lines[idx++]);
const arr = [];
const result = [];

for (let i = 0; i < q; i++) {
  const parts = lines[idx++].split(' ');
  if (parts[0] === 'push') {
    arr.push(parseInt(parts[1]));
  } else if (parts[0] === 'pop') {
    result.push(arr.pop());
  } else if (parts[0] === 'get') {
    result.push(arr[parseInt(parts[1])]);
  } else if (parts[0] === 'size') {
    result.push(arr.length);
  }
}

console.log(result.join('\n'));
```

입력

```
6
push 10
push 20
push 30
pop
size
get 0
```

출력

```
30
2
10
```
