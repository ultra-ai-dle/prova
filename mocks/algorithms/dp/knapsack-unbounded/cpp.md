# algorithms/dp/knapsack-unbounded — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n, W;
  cin >> n >> W;
  vector<int> w(n), v(n);
  for (int i = 0; i < n; i++) cin >> w[i] >> v[i];
  vector<int> dp(W + 1, 0);
  for (int c = 1; c <= W; c++) {
    for (int i = 0; i < n; i++) {
      if (w[i] <= c) {
        dp[c] = max(dp[c], dp[c - w[i]] + v[i]);
      }
    }
  }
  cout << dp[W] << '\n';
  return 0;
}
```

입력

```
4 8
2 3
3 4
4 5
5 6
```

출력

```
12
```
