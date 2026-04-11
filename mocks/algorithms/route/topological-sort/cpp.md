# topological-sort — C++

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
  vector<vector<int>> g(n);
  vector<int> indeg(n);
  for (int k = 0; k < m; k++) {
    int u, v;
    cin >> u >> v;
    g[u].push_back(v);
    indeg[v]++;
  }
  for (int i = 0; i < n; i++) sort(g[i].begin(), g[i].end());
  priority_queue<int, vector<int>, greater<int>> q;
  for (int i = 0; i < n; i++)
    if (indeg[i] == 0) q.push(i);
  vector<int> out;
  while (!q.empty()) {
    int u = q.top();
    q.pop();
    out.push_back(u);
    for (int v : g[u]) {
      if (--indeg[v] == 0) q.push(v);
    }
  }
  for (int i = 0; i < (int)out.size(); i++) {
    if (i) cout << ' ';
    cout << out[i];
  }
  cout << '\n';
}
```

입력

```
4 4
0 1
0 2
1 3
2 3
```

출력

```
0 1 2 3
```
