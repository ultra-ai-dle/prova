# floyd-warshall — C++

`Main.cpp`

```cpp
#include <iostream>
#include <vector>
#include <climits>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, m;
  cin >> n >> m;
  const long long INF = 1e18;
  vector<vector<long long>> d(n, vector<long long>(n, INF));
  for (int i = 0; i < n; i++) d[i][i] = 0;
  for (int k = 0; k < m; k++) {
    int u, v, w;
    cin >> u >> v >> w;
    d[u][v] = min(d[u][v], (long long)w);
  }
  for (int k = 0; k < n; k++)
    for (int i = 0; i < n; i++)
      for (int j = 0; j < n; j++)
        if (d[i][k] != INF && d[k][j] != INF)
          d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
  for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
      if (j) cout << ' ';
      if (d[i][j] == INF) cout << "INF";
      else cout << d[i][j];
    }
    cout << '\n';
  }
}
```

입력

```
4 5
0 1 3
0 3 7
1 2 2
2 3 1
3 0 6
```

출력

```
0 3 5 6
INF 0 2 3
INF INF 0 1
6 9 11 0
```
