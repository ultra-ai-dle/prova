# algorithms/sort/insertion — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const n = parseInt(lines[0]);
const arr = lines[1].split(' ').map(Number);

for (let i = 1; i < n; i++) {
  const key = arr[i];
  let j = i - 1;
  while (j >= 0 && arr[j] > key) {
    arr[j + 1] = arr[j];
    j--;
  }
  arr[j + 1] = key;
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
