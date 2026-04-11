# KMP — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

function buildFailure(p) {
  const m = p.length;
  const fail = new Array(m).fill(0);
  let j = 0;
  for (let i = 1; i < m; i++) {
    while (j > 0 && p[i] !== p[j]) j = fail[j - 1];
    if (p[i] === p[j]) j++;
    fail[i] = j;
  }
  return fail;
}

function kmp(t, p) {
  const fail = buildFailure(p);
  const result = [];
  let j = 0;
  for (let i = 0; i < t.length; i++) {
    while (j > 0 && t[i] !== p[j]) j = fail[j - 1];
    if (t[i] === p[j]) j++;
    if (j === p.length) {
      result.push(i - p.length + 1);
      j = fail[j - 1];
    }
  }
  return result;
}

const t = lines[0];
const p = lines[1];
const ans = kmp(t, p);
console.log(ans.length ? ans.join(' ') : -1);
```

입력

```
AABAACAADAABAABA
AABA
```

출력

```
0 9 12
```
