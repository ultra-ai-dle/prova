# Tree Diameter — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int n;
vector<pair<int,int>> graph[100005];

pair<int,int> bfs(int start) {
  vector<int> dist(n, -1);
  dist[start] = 0;
  queue<int> q;
  q.push(start);
  while (!q.empty()) {
    int u = q.front(); q.pop();
    for (auto [v, w] : graph[u]) {
      if (dist[v] == -1) {
        dist[v] = dist[u] + w;
        q.push(v);
      }
    }
  }
  int far = 0;
  for (int i = 1; i < n; i++) if (dist[i] > dist[far]) far = i;
  return {far, dist[far]};
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  cin >> n;
  for (int i = 0; i < n - 1; i++) {
    int u, v, w; cin >> u >> v >> w;
    graph[u].push_back({v, w});
    graph[v].push_back({u, w});
  }
  auto [far1, _] = bfs(0);
  auto [far2, diameter] = bfs(far1);
  cout << diameter << '\n';
}
```

입력

```
5
0 1 2
1 2 3
2 3 1
1 4 5
```

출력

```
9
```
