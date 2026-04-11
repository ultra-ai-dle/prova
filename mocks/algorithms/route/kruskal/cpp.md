# kruskal — C++

```cpp
#include <algorithm>
#include <iostream>
#include <tuple>
#include <vector>
using namespace std;

struct DSU {
  vector<int> p;
  DSU(int n) : p(n) {
    for (int i = 0; i < n; i++) p[i] = i;
  }
  int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
  bool unite(int a, int b) {
    a = find(a);
    b = find(b);
    if (a == b) return false;
    p[a] = b;
    return true;
  }
};

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, m;
  cin >> n >> m;
  vector<tuple<int, int, int>> edges;
  for (int k = 0; k < m; k++) {
    int u, v, w;
    cin >> u >> v >> w;
    edges.push_back({w, u, v});
  }
  sort(edges.begin(), edges.end());
  DSU d(n);
  int total = 0;
  for (auto [w, u, v] : edges) {
    if (d.unite(u, v)) total += w;
  }
  cout << total << '\n';
}
```

입력

```
3 3
0 1 1
1 2 2
0 2 3
```

출력

```
3
```
