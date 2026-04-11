# Rolling Hash — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  string s;
  int k;
  cin >> s >> k;
  const long long BASE = 31LL;
  const long long MOD = 1000000007LL;
  int n = s.size();
  long long pw = 1LL;
  for (int i = 0; i < k - 1; i++) pw = pw * BASE % MOD;
  long long h = 0LL;
  for (int i = 0; i < k; i++) {
    h = (h * BASE + (s[i] - 'a' + 1)) % MOD;
  }
  bool first = true;
  auto print = [&](long long v) {
    if (!first) cout << ' ';
    cout << v;
    first = false;
  };
  print(h);
  for (int i = 1; i <= n - k; i++) {
    h = (h - (long long)(s[i - 1] - 'a' + 1) * pw % MOD + MOD) % MOD;
    h = (h * BASE + (s[i + k - 1] - 'a' + 1)) % MOD;
    print(h);
  }
  cout << '\n';
  return 0;
}
```

입력

```
abcde
3
```

출력

```
1026 2019 3012
```
