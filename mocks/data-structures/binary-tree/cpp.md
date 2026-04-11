# binary-tree — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int val[105], lc[105], rc[105];
vector<int> pre, ino, post;

void preorder(int i) {
  if (i == -1) return;
  pre.push_back(val[i]);
  preorder(lc[i]);
  preorder(rc[i]);
}
void inorder(int i) {
  if (i == -1) return;
  inorder(lc[i]);
  ino.push_back(val[i]);
  inorder(rc[i]);
}
void postorder(int i) {
  if (i == -1) return;
  postorder(lc[i]);
  postorder(rc[i]);
  post.push_back(val[i]);
}

void print_vec(const vector<int>& v) {
  for (int i = 0; i < (int)v.size(); i++) {
    if (i) cout << ' ';
    cout << v[i];
  }
  cout << '\n';
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> nodes(n);
  fill(lc, lc + n, -1); fill(rc, rc + n, -1);
  for (int i = 0; i < n; i++) { cin >> nodes[i]; val[i] = nodes[i]; }
  for (int i = 0; i < n; i++) {
    if (nodes[i] == -1) continue;
    int l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && nodes[l] != -1) lc[i] = l;
    if (r < n && nodes[r] != -1) rc[i] = r;
  }
  preorder(0); print_vec(pre);
  inorder(0);  print_vec(ino);
  postorder(0); print_vec(post);
  return 0;
}
```

입력

```
7
1 2 3 4 5 6 7
```

출력

```
1 2 4 5 3 6 7
4 2 5 1 6 3 7
4 5 2 6 7 3 1
```
