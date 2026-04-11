# graph-adjacency-list — C++
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
  int u;
  cin >> u;
  sort(graph[u].begin(), graph[u].end());
  for (int i = 0; i < (int)graph[u].size(); i++) {
    if (i > 0) cout << ' ';
    cout << graph[u][i];
  }
  cout << '\n';
  return 0;
}
```

입력

```
4 4
0 1
0 2
1 3
2 3
0
```

출력

```
1 2
```
