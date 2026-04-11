# Bridges — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n, m;
  cin >> n >> m;
  vector<vector<int>> graph(n);
  for (int i = 0; i < m; i++) {
    int u, v;
    cin >> u >> v;
    graph[u].push_back(v);
    graph[v].push_back(u);
  }

  vector<int> disc(n, -1), low(n, 0);
  int timer = 0;
  vector<pair<int,int>> bridges;

  for (int start = 0; start < n; start++) {
    if (disc[start] != -1) continue;
    disc[start] = low[start] = timer++;
    stack<tuple<int,int,int>> st;
    st.push({start, -1, 0});

    while (!st.empty()) {
      auto& [node, par, i] = st.top();
      if (i < (int)graph[node].size()) {
        int nb = graph[node][i++];
        if (nb == par) continue;
        if (disc[nb] == -1) {
          disc[nb] = low[nb] = timer++;
          st.push({nb, node, 0});
        } else {
          low[node] = min(low[node], disc[nb]);
        }
      } else {
        st.pop();
        if (!st.empty()) {
          auto& [p, pp, pi] = st.top();
          low[p] = min(low[p], low[node]);
          if (low[node] > disc[p]) {
            bridges.push_back({min(p, node), max(p, node)});
          }
        }
      }
    }
  }

  sort(bridges.begin(), bridges.end());
  for (auto [u, v] : bridges) cout << u << ' ' << v << '\n';
  return 0;
}
```

입력

```
5 5
0 1
1 2
2 0
1 3
3 4
```

출력

```
1 3
3 4
```
