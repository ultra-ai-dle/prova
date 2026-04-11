# algorithms/sort/bubble — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = parseInt(lines[0]);
const arr = lines[1].split(' ').map(Number);

for (let i = 0; i < n; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
    }
  }
}

console.log(arr.join(' '));
```

입력

```
6
5 3 8 1 4 2
```

출력

```
1 2 3 4 5 8
```
