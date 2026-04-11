# LCA — C++
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

  vector<int> depth(n, -1), parent(n, -1);
  depth[0] = 0;
  stack<int> st;
  st.push(0);
  while (!st.empty()) {
    int node = st.top(); st.pop();
    for (int nb : graph[node]) {
      if (depth[nb] == -1) {
        depth[nb] = depth[node] + 1;
        parent[nb] = node;
        st.push(nb);
      }
    }
  }

  auto lca = [&](int u, int v) {
    while (depth[u] > depth[v]) u = parent[u];
    while (depth[v] > depth[u]) v = parent[v];
    while (u != v) { u = parent[u]; v = parent[v]; }
    return u;
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
