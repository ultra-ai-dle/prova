# bellman-ford — C++

`Main.cpp`

```cpp
#include <iostream>
#include <vector>
#include <climits>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, m, s;
  cin >> n >> m >> s;
  vector<tuple<int, int, int>> edges(m);
  for (auto& [u, v, w] : edges) cin >> u >> v >> w;
  const long long INF = 1e18;
  vector<long long> d(n, INF);
  d[s] = 0;
  for (int i = 0; i < n - 1; i++) {
    for (auto [u, v, w] : edges) {
      if (d[u] != INF && d[u] + w < d[v]) d[v] = d[u] + w;
    }
  }
  for (auto [u, v, w] : edges) {
    if (d[u] != INF && d[u] + w < d[v]) {
      cout << "NEGATIVE CYCLE\n";
      return 0;
    }
  }
  for (int i = 0; i < n; i++) {
    if (i) cout << ' ';
    if (d[i] == INF) cout << "INF";
    else cout << d[i];
  }
  cout << '\n';
}
```

입력

```
5 7 0
0 1 6
0 2 7
1 2 8
1 3 5
1 4 -4
2 4 9
3 1 -2
```

출력

```
0 2 7 4 -2
```
