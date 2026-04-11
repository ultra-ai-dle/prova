# monotonic-queue — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const [n, k] = lines[0].split(' ').map(Number);
const arr = lines[1].split(' ').map(Number);
const dq = [];
const result = [];
for (let i = 0; i < n; i++) {
  while (dq.length && dq[0] < i - k + 1) dq.shift();
  while (dq.length && arr[dq[dq.length - 1]] < arr[i]) dq.pop();
  dq.push(i);
  if (i >= k - 1) result.push(arr[dq[0]]);
}
console.log(result.join(' '));
```

입력

```
8 3
1 3 -1 -3 5 3 6 7
```

출력

```
3 3 5 5 6 7
```
