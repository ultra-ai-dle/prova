# two-pointers — JavaScript

```javascript
const fs = require('fs');

function main() {
  const lines = fs.readFileSync(0, 'utf8').trim().split('\n');
  const n = parseInt(lines[0], 10);
  const a = lines[1].trim().split(/\s+/).map((x) => parseInt(x, 10));
  const t = parseInt(lines[2], 10);
  let i = 0;
  let j = n - 1;
  while (i < j) {
    const s = a[i] + a[j];
    if (s === t) {
      console.log(`${a[i]} ${a[j]}`);
      return;
    }
    if (s < t) i++;
    else j--;
  }
  console.log(-1);
}

main();
```

입력

```
6
1 2 4 5 7 11
13
```

출력

```
2 11
```
