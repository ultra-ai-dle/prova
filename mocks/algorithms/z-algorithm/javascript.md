# Z Algorithm — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function zFunction(s) {
  const n = s.length;
  const z = new Array(n).fill(0);
  z[0] = n;
  let l = 0, r = 0;
  for (let i = 1; i < n; i++) {
    if (i < r) z[i] = Math.min(r - i, z[i - l]);
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
    if (i + z[i] > r) { l = i; r = i + z[i]; }
  }
  return z;
}

const t = lines[0];
const p = lines[1];
const s = p + '$' + t;
const z = zFunction(s);
const m = p.length;
const result = [];
for (let i = m + 1; i < s.length; i++) {
  if (z[i] === m) result.push(i - m - 1);
}
console.log(result.length ? result.join(' ') : -1);
```

입력

```
aabxaaabxaaabxaab
aab
```

출력

```
0 5 9 14
```
