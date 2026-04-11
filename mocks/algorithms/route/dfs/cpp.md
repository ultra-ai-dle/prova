# dfs — C++

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int n;
vector<vector<int>> g;
vector<char> seen;
vector<int> out;

void dfs(int u) {
  seen[u] = 1;
  out.push_back(u);
  for (int v : g[u]) {
    if (!seen[v]) dfs(v);
  }
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int m, st;
  cin >> n >> m >> st;
  g.assign(n, {});
  for (int k = 0; k < m; k++) {
    int a, b;
    cin >> a >> b;
    g[a].push_back(b);
    g[b].push_back(a);
  }
  for (int i = 0; i < n; i++) sort(g[i].begin(), g[i].end());
  seen.assign(n, 0);
  dfs(st);
  for (int i = 0; i < (int)out.size(); i++) {
    if (i) cout << ' ';
    cout << out[i];
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
