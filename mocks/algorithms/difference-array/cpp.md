# difference-array — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n, q; cin >> n >> q;
  vector<long long> diff(n + 1, 0);
  while (q--) {
    int l, r; long long v; cin >> l >> r >> v;
    diff[l] += v;
    if (r + 1 <= n) diff[r + 1] -= v;
  }
  vector<long long> arr(n);
  arr[0] = diff[0];
  for (int i = 1; i < n; i++) arr[i] = arr[i - 1] + diff[i];
  for (int i = 0; i < n; i++) {
    if (i > 0) cout << ' ';
    cout << arr[i];
  }
  cout << '\n';
}
```

입력

```
6 3
1 3 2
2 5 3
0 1 4
```

출력

```
4 6 5 5 3 0
```
