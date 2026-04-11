# Z Algorithm — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

vector<int> zFunction(const string& s) {
  int n = s.size();
  vector<int> z(n, 0);
  z[0] = n;
  int l = 0, r = 0;
  for (int i = 1; i < n; i++) {
    if (i < r) z[i] = min(r - i, z[i - l]);
    while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
    if (i + z[i] > r) { l = i; r = i + z[i]; }
  }
  return z;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  string t, p;
  cin >> t >> p;
  string s = p + "$" + t;
  vector<int> z = zFunction(s);
  int m = p.size();
  vector<int> result;
  for (int i = m + 1; i < (int)s.size(); i++) {
    if (z[i] == m) result.push_back(i - m - 1);
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
aabxaaabxaaabxaab
aab
```

출력

```
0 5 9 14
```
