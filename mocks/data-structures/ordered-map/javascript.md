# Ordered Map — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const q = parseInt(lines[idx++]);
const map = new Map();
const result = [];

for (let i = 0; i < q; i++) {
  const parts = lines[idx++].split(' ');
  if (parts[0] === 'put') {
    map.set(parseInt(parts[1]), parseInt(parts[2]));
  } else if (parts[0] === 'get') {
    result.push(map.get(parseInt(parts[1])));
  } else if (parts[0] === 'remove') {
    map.delete(parseInt(parts[1]));
  } else if (parts[0] === 'min') {
    result.push(Math.min(...map.keys()));
  }
}

console.log(result.join('\n'));
```

입력

```
5
put 3 30
put 1 10
put 2 20
min
get 2
```

출력

```
1
20
```
