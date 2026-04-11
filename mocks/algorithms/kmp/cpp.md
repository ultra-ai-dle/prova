# KMP — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

vector<int> buildFailure(const string& p) {
  int m = p.size();
  vector<int> fail(m, 0);
  int j = 0;
  for (int i = 1; i < m; i++) {
    while (j > 0 && p[i] != p[j]) j = fail[j - 1];
    if (p[i] == p[j]) j++;
    fail[i] = j;
  }
  return fail;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  string t, p;
  cin >> t >> p;
  vector<int> fail = buildFailure(p);
  vector<int> result;
  int j = 0;
  for (int i = 0; i < (int)t.size(); i++) {
    while (j > 0 && t[i] != p[j]) j = fail[j - 1];
    if (t[i] == p[j]) j++;
    if (j == (int)p.size()) {
      result.push_back(i - (int)p.size() + 1);
      j = fail[j - 1];
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
AABAACAADAABAABA
AABA
```

출력

```
0 9 12
```
