# Circular Queue — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

let idx = 0;
const k = Number(lines[idx++]);
const q = Number(lines[idx++]);
const queue = new Array(k + 1).fill(0);
let front = 0, rear = 0;
const results = [];

function enqueue(v) {
  const nxt = (rear + 1) % (k + 1);
  if (nxt === front) { results.push('FULL'); return; }
  queue[rear] = v;
  rear = nxt;
}

function dequeue() {
  if (front === rear) { results.push('EMPTY'); return; }
  results.push(queue[front]);
  front = (front + 1) % (k + 1);
}

function getFront() {
  if (front === rear) { results.push('EMPTY'); return; }
  results.push(queue[front]);
}

for (let i = 0; i < q; i++) {
  const op = lines[idx++].split(' ');
  if (op[0] === 'enqueue') enqueue(Number(op[1]));
  else if (op[0] === 'dequeue') dequeue();
  else if (op[0] === 'front') getFront();
  else if (op[0] === 'isEmpty') results.push(front !== rear ? 0 : 1);
}
console.log(results.join('\n'));
```

입력

```
3
7
enqueue 1
enqueue 2
enqueue 3
enqueue 4
dequeue
front
isEmpty
```

출력

```
FULL
1
2
0
```
