# algorithms/euler-tour — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n;
  cin >> n;
  vector<vector<int>> adj(n);
  for (int i = 0; i < n - 1; i++) {
    int u, v;
    cin >> u >> v;
    adj[u].push_back(v);
    adj[v].push_back(u);
  }

  vector<int> tin(n), tout(n);
  int timer = 0;
  stack<tuple<int,int,bool>> stk;
  stk.push({0, -1, false});
  while (!stk.empty()) {
    auto [u, parent, leaving] = stk.top();
    stk.pop();
    if (leaving) {
      tout[u] = timer++;
    } else {
      tin[u] = timer++;
      stk.push({u, parent, true});
      for (int i = adj[u].size() - 1; i >= 0; i--) {
        int v = adj[u][i];
        if (v != parent) stk.push({v, u, false});
      }
    }
  }

  for (int i = 0; i < n; i++) {
    cout << tin[i] << ' ' << tout[i] << '\n';
  }
  return 0;
}
```

입력

```
5
0 1
0 2
1 3
1 4
```

출력

```
0 9
1 6
7 8
2 3
4 5
```
