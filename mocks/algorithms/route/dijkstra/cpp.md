# dijkstra — C++

```cpp
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, s, t, m;
  cin >> n >> s >> t >> m;
  vector<vector<pair<int, int>>> g(n);
  for (int k = 0; k < m; k++) {
    int u, v, w;
    cin >> u >> v >> w;
    g[u].push_back({v, w});
  }
  const int INF = 1e9;
  vector<int> d(n, INF);
  d[s] = 0;
  using P = pair<int, int>;
  priority_queue<P, vector<P>, greater<P>> pq;
  pq.push({0, s});
  while (!pq.empty()) {
    auto [du, u] = pq.top();
    pq.pop();
    if (du != d[u]) continue;
    for (auto [v, w] : g[u]) {
      if (du + w < d[v]) {
        d[v] = du + w;
        pq.push({d[v], v});
      }
    }
  }
  cout << d[t] << '\n';
}
```

입력

```
3 0 1 3
0 1 4
0 2 1
2 1 2
```

출력

```
3
```
