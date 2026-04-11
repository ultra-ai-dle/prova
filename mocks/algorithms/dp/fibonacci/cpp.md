# Fibonacci — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n;
  cin >> n;
  if (n == 0) {
    cout << 0;
    return 0;
  }
  vector<long long> dp(n + 1, 0);
  dp[1] = 1;
  for (int i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  cout << dp[n];
  return 0;
}
```

입력

```
10
```

출력

```
55
```
