# Bitmask DP — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n; cin >> n;
  vector<vector<int>> dist(n, vector<int>(n));
  for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
      cin >> dist[i][j];

  const int INF = 1e9;
  int size = 1 << n;
  vector<vector<int>> dp(size, vector<int>(n, INF));
  dp[1][0] = 0;

  for (int mask = 0; mask < size; mask++) {
    for (int u = 0; u < n; u++) {
      if (dp[mask][u] == INF) continue;
      if (!((mask >> u) & 1)) continue;
      for (int v = 0; v < n; v++) {
        if ((mask >> v) & 1) continue;
        int nmask = mask | (1 << v);
        int cost = dp[mask][u] + dist[u][v];
        if (cost < dp[nmask][v]) dp[nmask][v] = cost;
      }
    }
  }

  int full = size - 1, ans = INF;
  for (int u = 1; u < n; u++)
    ans = min(ans, dp[full][u] + dist[u][0]);
  cout << ans << '\n';
}
```

입력

```
4
0 10 15 20
5 0 9 10
6 13 0 12
8 8 9 0
```

출력

```
35
```
