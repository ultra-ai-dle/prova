# Rabin-Karp — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  string t, p;
  getline(cin, t);
  getline(cin, p);
  const long long BASE = 31LL;
  const long long MOD = 1000000007LL;
  int n = t.size(), m = p.size();
  vector<int> result;
  if (m <= n) {
    long long pw = 1LL;
    for (int i = 0; i < m - 1; i++) pw = pw * BASE % MOD;
    long long ph = 0LL, th = 0LL;
    for (int i = 0; i < m; i++) {
      ph = (ph * BASE + p[i]) % MOD;
      th = (th * BASE + t[i]) % MOD;
    }
    for (int i = 0; i <= n - m; i++) {
      if (th == ph && t.substr(i, m) == p) result.push_back(i);
      if (i < n - m) {
        th = (th - (long long)t[i] * pw % MOD + MOD) % MOD;
        th = (th * BASE + t[i + m]) % MOD;
      }
    }
  }
  if (result.empty()) {
    cout << -1;
  } else {
    for (int i = 0; i < (int)result.size(); i++) {
      if (i > 0) cout << ' ';
      cout << result[i];
    }
  }
  cout << '\n';
  return 0;
}
```

입력

```
GEEKS FOR GEEKS
GEEKS
```

출력

```
0 10
```
