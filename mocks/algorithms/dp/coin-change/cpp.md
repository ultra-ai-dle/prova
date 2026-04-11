# Coin Change — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int k, amount;
  cin >> k >> amount;
  vector<int> coins(k);
  for (int i = 0; i < k; i++) cin >> coins[i];
  const int INF = INT_MAX;
  vector<int> dp(amount + 1, INF);
  dp[0] = 0;
  for (int c : coins) {
    for (int x = c; x <= amount; x++) {
      if (dp[x - c] != INF && dp[x - c] + 1 < dp[x]) {
        dp[x] = dp[x - c] + 1;
      }
    }
  }
  cout << (dp[amount] == INF ? -1 : dp[amount]);
  return 0;
}
```

입력

```
3 11
1 5 6
```

출력

```
2
```
