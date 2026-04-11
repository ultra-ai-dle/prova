# prim — C++

`Main.cpp`

```cpp
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, m;
  cin >> n >> m;
  vector<vector<pair<int, int>>> g(n);
  for (int k = 0; k < m; k++) {
    int u, v, w;
    cin >> u >> v >> w;
    g[u].push_back({w, v});
    g[v].push_back({w, u});
  }
  vector<bool> visited(n, false);
  long long total = 0;
  using P = pair<int, int>;
  priority_queue<P, vector<P>, greater<P>> pq;
  pq.push({0, 0});
  while (!pq.empty()) {
    auto [cost, u] = pq.top();
    pq.pop();
    if (visited[u]) continue;
    visited[u] = true;
    total += cost;
    for (auto [w, v] : g[u]) {
      if (!visited[v]) pq.push({w, v});
    }
  }
  cout << total << '\n';
}
```

입력

```
5 7
0 1 2
0 3 6
1 2 3
1 3 8
1 4 5
2 4 7
3 4 9
```

출력

```
17
```
