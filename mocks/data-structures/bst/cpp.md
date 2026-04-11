# bst — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

struct Node {
  int v;
  Node* left;
  Node* right;
  Node(int v) : v(v), left(nullptr), right(nullptr) {}
};

Node* insert(Node* root, int v) {
  if (!root) return new Node(v);
  if (v < root->v) root->left = insert(root->left, v);
  else if (v > root->v) root->right = insert(root->right, v);
  return root;
}

int search(Node* root, int v) {
  if (!root) return 0;
  if (v == root->v) return 1;
  return v < root->v ? search(root->left, v) : search(root->right, v);
}

bool inFirst = true;
void inorder(Node* root) {
  if (!root) return;
  inorder(root->left);
  if (!inFirst) cout << ' ';
  cout << root->v;
  inFirst = false;
  inorder(root->right);
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int q;
  cin >> q;
  Node* root = nullptr;
  while (q--) {
    string op;
    cin >> op;
    if (op == "insert") {
      int v; cin >> v;
      root = insert(root, v);
    } else if (op == "search") {
      int v; cin >> v;
      cout << search(root, v) << '\n';
    } else if (op == "inorder") {
      inFirst = true;
      inorder(root);
      cout << '\n';
    }
  }
  return 0;
}
```

입력

```
6
insert 5
insert 3
insert 7
insert 1
search 3
inorder
```

출력

```
1
1 3 5 7
```
