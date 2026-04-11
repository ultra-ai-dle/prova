# String Builder — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').split('\n');

let idx = 0;
const q = parseInt(lines[idx++]);
const parts = [];
const result = [];

for (let i = 0; i < q; i++) {
  const line = lines[idx++];
  const spaceIdx = line.indexOf(' ');
  const cmd = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
  const arg = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1);
  if (cmd === 'append') {
    parts.push(arg);
  } else if (cmd === 'prepend') {
    parts.unshift(arg);
  } else if (cmd === 'build') {
    result.push(parts.join(''));
  }
}

console.log(result.join('\n'));
```

입력

```
4
append hello
append  world
prepend say 
build
```

출력

```
say hello world
```
