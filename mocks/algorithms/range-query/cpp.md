# algorithms/range-query — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int tree[400005];
int n;

void build(vector<int>& arr, int node, int start, int end) {
  if (start == end) {
    tree[node] = arr[start];
    return;
  }
  int mid = (start + end) / 2;
  build(arr, 2 * node, start, mid);
  build(arr, 2 * node + 1, mid + 1, end);
  tree[node] = min(tree[2 * node], tree[2 * node + 1]);
}

int query(int node, int start, int end, int l, int r) {
  if (r < start || end < l) return INT_MAX;
  if (l <= start && end <= r) return tree[node];
  int mid = (start + end) / 2;
  return min(query(2 * node, start, mid, l, r),
             query(2 * node + 1, mid + 1, end, l, r));
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  cin >> n;
  vector<int> arr(n);
  for (int i = 0; i < n; i++) cin >> arr[i];
  build(arr, 1, 0, n - 1);
  int q;
  cin >> q;
  while (q--) {
    int l, r;
    cin >> l >> r;
    cout << query(1, 0, n - 1, l, r) << '\n';
  }
  return 0;
}
```

입력

```
8
2 4 3 1 6 7 8 5
3
1 5
0 7
3 6
```

출력

```
1
1
1
```
