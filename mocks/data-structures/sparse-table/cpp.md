# 구간 최솟값 쿼리 (스파스 테이블) — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n; cin >> n;
  vector<int> arr(n);
  for (int i = 0; i < n; i++) cin >> arr[i];

  int LOG = max(1, (int)log2(n) + 1);
  vector<vector<int>> sparse(LOG, vector<int>(n, INT_MAX));
  sparse[0] = arr;

  for (int j = 1; j < LOG; j++) {
    for (int i = 0; i + (1 << j) <= n; i++) {
      sparse[j][i] = min(sparse[j-1][i], sparse[j-1][i + (1 << (j-1))]);
    }
  }

  auto query = [&](int l, int r) {
    int k = (int)log2(r - l + 1);
    return min(sparse[k][l], sparse[k][r - (1 << k) + 1]);
  };

  int q; cin >> q;
  while (q--) {
    int l, r; cin >> l >> r;
    cout << query(l, r) << '\n';
  }

  return 0;
}
```

입력

```
7
2 4 3 1 6 7 8
3
1 5
0 6
2 4
```

출력

```
1
1
1
```
