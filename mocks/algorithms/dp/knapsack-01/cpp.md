# Knapsack 0-1 — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n, W;
  cin >> n >> W;
  vector<long long> dp(W + 1, 0);
  for (int i = 0; i < n; i++) {
    int w, v;
    cin >> w >> v;
    for (int c = W; c >= w; c--) {
      dp[c] = max(dp[c], dp[c - w] + (long long)v);
    }
  }
  cout << dp[W];
  return 0;
}
```

입력

```
4 5
2 3
3 4
4 5
5 6
```

출력

```
7
```
