# algorithms/tree-centroid — C++

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

  vector<int> size(n, 1), par(n, -1), order;
  order.reserve(n);
  vector<bool> visited(n, false);
  stack<int> stk;
  stk.push(0);
  visited[0] = true;
  while (!stk.empty()) {
    int u = stk.top(); stk.pop();
    order.push_back(u);
    for (int v : adj[u]) {
      if (!visited[v]) {
        visited[v] = true;
        par[v] = u;
        stk.push(v);
      }
    }
  }
  for (int i = n - 1; i >= 0; i--) {
    int u = order[i];
    if (par[u] != -1) size[par[u]] += size[u];
  }

  vector<int> result;
  for (int u = 0; u < n; u++) {
    int maxComp = n - size[u];
    for (int v : adj[u]) {
      if (size[v] < size[u]) maxComp = max(maxComp, size[v]);
    }
    if (maxComp <= n / 2) result.push_back(u);
  }
  sort(result.begin(), result.end());

  for (int c : result) cout << c << '\n';
  return 0;
}
```

입력

```
7
0 1
0 2
1 3
1 4
2 5
2 6
```

출력

```
0
```
