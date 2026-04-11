# LCA (Binary Lifting) — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n;
  cin >> n;
  vector<vector<int>> graph(n);
  for (int i = 0; i < n - 1; i++) {
    int u, v;
    cin >> u >> v;
    graph[u].push_back(v);
    graph[v].push_back(u);
  }

  int LOG = max(1, (int)log2(n) + 1);
  vector<int> depth(n, -1);
  vector<vector<int>> up(LOG, vector<int>(n, -1));

  depth[0] = 0;
  up[0][0] = 0;
  stack<int> st;
  st.push(0);
  while (!st.empty()) {
    int node = st.top(); st.pop();
    for (int nb : graph[node]) {
      if (depth[nb] == -1) {
        depth[nb] = depth[node] + 1;
        up[0][nb] = node;
        st.push(nb);
      }
    }
  }

  for (int k = 1; k < LOG; k++)
    for (int v = 0; v < n; v++)
      if (up[k-1][v] != -1) up[k][v] = up[k-1][up[k-1][v]];

  auto lca = [&](int u, int v) {
    if (depth[u] < depth[v]) swap(u, v);
    int diff = depth[u] - depth[v];
    for (int k = 0; k < LOG; k++) if ((diff >> k) & 1) u = up[k][u];
    if (u == v) return u;
    for (int k = LOG - 1; k >= 0; k--)
      if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
    return up[0][u];
  };

  int q;
  cin >> q;
  while (q--) {
    int u, v;
    cin >> u >> v;
    cout << lca(u, v) << '\n';
  }
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
3
3 4
5 6
3 5
```

출력

```
1
2
0
```
