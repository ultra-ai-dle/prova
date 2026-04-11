# 이항 계수 C(n, k) mod 1e9+7 — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1e9 + 7;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n, k;
  cin >> n >> k;

  vector<vector<long long>> dp(n + 1, vector<long long>(n + 1, 0));
  for (int i = 0; i <= n; i++) {
    dp[i][0] = 1;
    for (int j = 1; j <= i; j++) {
      dp[i][j] = (dp[i-1][j-1] + dp[i-1][j]) % MOD;
    }
  }

  cout << dp[n][k] << '\n';
}
```

입력

```
10 3
```

출력

```
120
```
