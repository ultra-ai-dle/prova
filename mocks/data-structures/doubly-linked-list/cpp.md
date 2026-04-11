# Doubly Linked List — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

struct Node {
  int val;
  Node* prev;
  Node* next;
  Node(int v) : val(v), prev(nullptr), next(nullptr) {}
};

Node* head = nullptr;
Node* tail = nullptr;

void push_back(int v) {
  Node* node = new Node(v);
  if (!tail) { head = tail = node; return; }
  node->prev = tail;
  tail->next = node;
  tail = node;
}

void push_front(int v) {
  Node* node = new Node(v);
  if (!head) { head = tail = node; return; }
  node->next = head;
  head->prev = node;
  head = node;
}

void pop_back() {
  if (!tail) return;
  Node* t = tail;
  tail = tail->prev;
  if (tail) tail->next = nullptr;
  else head = nullptr;
  delete t;
}

void pop_front() {
  if (!head) return;
  Node* h = head;
  head = head->next;
  if (head) head->prev = nullptr;
  else tail = nullptr;
  delete h;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n; cin >> n;
  while (n--) {
    string op; cin >> op;
    if (op == "push_back") { int v; cin >> v; push_back(v); }
    else if (op == "push_front") { int v; cin >> v; push_front(v); }
    else if (op == "pop_back") pop_back();
    else if (op == "pop_front") pop_front();
    else {
      Node* cur = head;
      bool first = true;
      while (cur) {
        if (!first) cout << ' ';
        cout << cur->val;
        first = false;
        cur = cur->next;
      }
      cout << '\n';
    }
  }
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
