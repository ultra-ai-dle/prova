# bfs — C++

```cpp
#include <algorithm>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, m, st;
  cin >> n >> m >> st;
  vector<vector<int>> g(n);
  for (int k = 0; k < m; k++) {
    int a, b;
    cin >> a >> b;
    g[a].push_back(b);
    g[b].push_back(a);
  }
  for (int i = 0; i < n; i++) sort(g[i].begin(), g[i].end());
  vector<char> seen(n, 0);
  queue<int> q;
  seen[st] = 1;
  q.push(st);
  bool first = true;
  while (!q.empty()) {
    int u = q.front();
    q.pop();
    if (!first) cout << ' ';
    first = false;
    cout << u;
    for (int v : g[u]) {
      if (!seen[v]) {
        seen[v] = 1;
        q.push(v);
      }
    }
  }
  cout << '\n';
}
```

입력

```
3 3 0
0 1
0 2
1 2
```

출력

```
0 1 2
```
