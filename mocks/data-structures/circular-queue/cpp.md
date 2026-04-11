# Circular Queue — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int k;
vector<int> queue_;
int front_ = 0, rear_ = 0;

bool isFull() { return (rear_ + 1) % (k + 1) == front_; }
bool isEmpty() { return front_ == rear_; }

void enqueue(int v) {
  if (isFull()) { cout << "FULL\n"; return; }
  queue_[rear_] = v;
  rear_ = (rear_ + 1) % (k + 1);
}

void dequeue() {
  if (isEmpty()) { cout << "EMPTY\n"; return; }
  cout << queue_[front_] << '\n';
  front_ = (front_ + 1) % (k + 1);
}

void front() {
  if (isEmpty()) cout << "EMPTY\n";
  else cout << queue_[front_] << '\n';
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  cin >> k;
  queue_.resize(k + 1);
  int q; cin >> q;
  string op;
  while (q--) {
    cin >> op;
    if (op == "enqueue") { int v; cin >> v; enqueue(v); }
    else if (op == "dequeue") dequeue();
    else if (op == "front") front();
    else if (op == "isEmpty") cout << (isEmpty() ? 1 : 0) << '\n';
  }
}
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
