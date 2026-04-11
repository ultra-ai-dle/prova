# sliding-window — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const [n, k] = lines[0].trim().split(/\s+/).map(Number);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  let cur = 0;
  for (let i = 0; i < k; i++) cur += a[i];
  let best = cur;
  for (let i = k; i < n; i++) {
    cur += a[i] - a[i - k];
    if (cur > best) best = cur;
  }
  console.log(best);
}

main();
```

입력

```
4 2
3 1 5 2
```

출력

```
7
```
