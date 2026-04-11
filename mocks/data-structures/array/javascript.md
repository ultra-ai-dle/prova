# Array — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const n = parseInt(lines[idx++]);
const arr = lines[idx++].split(' ').map(Number);
const q = parseInt(lines[idx++]);
const result = [];

for (let i = 0; i < q; i++) {
  const parts = lines[idx++].split(' ');
  if (parts[0] === 'get') {
    result.push(arr[parseInt(parts[1])]);
  } else if (parts[0] === 'set') {
    arr[parseInt(parts[1])] = parseInt(parts[2]);
  } else if (parts[0] === 'print') {
    result.push(arr.join(' '));
  }
}

console.log(result.join('\n'));
```

입력

```
5
1 2 3 4 5
4
get 2
set 2 99
get 2
print
```

출력

```
3
99
1 2 99 4 5
```
