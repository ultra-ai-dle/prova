# Doubly Linked List — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

class Node {
  constructor(val) {
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
  }
  pushBack(v) {
    const node = new Node(v);
    if (!this.tail) { this.head = this.tail = node; return; }
    node.prev = this.tail;
    this.tail.next = node;
    this.tail = node;
  }
  pushFront(v) {
    const node = new Node(v);
    if (!this.head) { this.head = this.tail = node; return; }
    node.next = this.head;
    this.head.prev = node;
    this.head = node;
  }
  popBack() {
    if (!this.tail) return;
    if (this.head === this.tail) { this.head = this.tail = null; return; }
    this.tail = this.tail.prev;
    this.tail.next = null;
  }
  popFront() {
    if (!this.head) return;
    if (this.head === this.tail) { this.head = this.tail = null; return; }
    this.head = this.head.next;
    this.head.prev = null;
  }
  print() {
    const res = [];
    let cur = this.head;
    while (cur) { res.push(cur.val); cur = cur.next; }
    console.log(res.join(' '));
  }
}

let idx = 0;
const n = Number(lines[idx++]);
const dll = new DoublyLinkedList();
for (let i = 0; i < n; i++) {
  const op = lines[idx++].split(' ');
  if (op[0] === 'push_back') dll.pushBack(Number(op[1]));
  else if (op[0] === 'push_front') dll.pushFront(Number(op[1]));
  else if (op[0] === 'pop_back') dll.popBack();
  else if (op[0] === 'pop_front') dll.popFront();
  else if (op[0] === 'print') dll.print();
}
```

입력

```
6
push_back 1
push_back 2
push_front 0
pop_front
push_back 3
print
```

출력

```
1 2 3
```
