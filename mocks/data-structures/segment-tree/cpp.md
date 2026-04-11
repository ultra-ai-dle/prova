# 구간 합 세그먼트 트리 — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int n;
vector<int> arr, tree;

void build(int node, int start, int end) {
  if (start == end) {
    tree[node] = arr[start];
  } else {
    int mid = (start + end) / 2;
    build(2*node, start, mid);
    build(2*node+1, mid+1, end);
    tree[node] = tree[2*node] + tree[2*node+1];
  }
}

void update(int node, int start, int end, int i, int val) {
  if (start == end) {
    arr[i] = val;
    tree[node] = val;
  } else {
    int mid = (start + end) / 2;
    if (i <= mid) update(2*node, start, mid, i, val);
    else update(2*node+1, mid+1, end, i, val);
    tree[node] = tree[2*node] + tree[2*node+1];
  }
}

int query(int node, int start, int end, int l, int r) {
  if (r < start || end < l) return 0;
  if (l <= start && end <= r) return tree[node];
  int mid = (start + end) / 2;
  return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r);
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  cin >> n;
  arr.resize(n);
  tree.resize(4 * n);
  for (int i = 0; i < n; i++) cin >> arr[i];
  build(1, 0, n-1);

  int q; cin >> q;
  string op;
  while (q--) {
    cin >> op;
    if (op == "update") {
      int i, val; cin >> i >> val;
      update(1, 0, n-1, i, val);
    } else {
      int l, r; cin >> l >> r;
      cout << query(1, 0, n-1, l, r) << '\n';
    }
  }

  return 0;
}
```

입력

```
5
1 2 3 4 5
3
update 1 10
query 0 3
query 2 4
```

출력

```
17
12
```
