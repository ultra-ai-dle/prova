# algorithms/sort/selection — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = parseInt(lines[0]);
const arr = lines[1].split(' ').map(Number);

for (let i = 0; i < n; i++) {
  let minIdx = i;
  for (let j = i + 1; j < n; j++) {
    if (arr[j] < arr[minIdx]) minIdx = j;
  }
  [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
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
