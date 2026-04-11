# 펜윅 트리 — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int n;
vector<int> tree;

void update(int i, int val) {
  for (; i <= n; i += i & (-i)) tree[i] += val;
}

int prefixSum(int i) {
  int s = 0;
  for (; i > 0; i -= i & (-i)) s += tree[i];
  return s;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  cin >> n;
  tree.assign(n + 1, 0);

  int q; cin >> q;
  string op;
  while (q--) {
    cin >> op;
    if (op == "update") {
      int i, val; cin >> i >> val;
      update(i, val);
    } else {
      int i; cin >> i;
      cout << prefixSum(i) << '\n';
    }
  }

  return 0;
}
```

입력

```
6
3
update 2 5
update 4 3
query 5
```

출력

```
8
```
