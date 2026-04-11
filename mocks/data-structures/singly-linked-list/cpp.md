# singly-linked-list — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

struct Node {
  int v;
  Node* nxt;
  Node(int x) : v(x), nxt(nullptr) {}
};

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> vals(n);
  for (int i = 0; i < n; i++) cin >> vals[i];
  Node* head = nullptr;
  for (int i = n - 1; i >= 0; i--) {
    Node* nd = new Node(vals[i]);
    nd->nxt = head;
    head = nd;
  }
  Node *prev = nullptr, *cur = head;
  while (cur) {
    Node* nxt = cur->nxt;
    cur->nxt = prev;
    prev = cur;
    cur = nxt;
  }
  bool first = true;
  for (cur = prev; cur; cur = cur->nxt) {
    if (!first) cout << ' ';
    first = false;
    cout << cur->v;
  }
  cout << '\n';
}
```

입력

```
5
1 2 3 4 5
```

출력

```
5 4 3 2 1
```
