# trie — C++

```cpp
#include <iostream>
#include <map>
#include <memory>
#include <string>
using namespace std;

struct Node {
  map<char, unique_ptr<Node>> nxt;
  int cnt = 0;
};

void insert(Node& r, const string& s) {
  r.cnt++;
  Node* cur = &r;
  for (char c : s) {
    if (!cur->nxt.count(c)) cur->nxt[c] = make_unique<Node>();
    cur = cur->nxt[c].get();
    cur->cnt++;
  }
}

int countPref(Node& r, const string& s) {
  Node* cur = &r;
  for (char c : s) {
    auto it = cur->nxt.find(c);
    if (it == cur->nxt.end()) return 0;
    cur = it->second.get();
  }
  return cur->cnt;
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int q;
  cin >> q;
  cin.ignore();
  Node root;
  while (q--) {
    string op, w;
    cin >> op >> w;
    if (op == "insert") {
      insert(root, w);
    } else {
      cout << countPref(root, w) << '\n';
    }
  }
}
```

입력

```
7
insert app
insert apple
insert appetite
count app
count ple
count apx
count z
```

출력

```
3
0
0
0
```
