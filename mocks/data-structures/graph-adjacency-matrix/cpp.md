# 무방향 그래프 인접 행렬 — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n, m; cin >> n >> m;
  vector<vector<int>> mat(n, vector<int>(n, 0));

  for (int i = 0; i < m; i++) {
    int u, v; cin >> u >> v;
    mat[u][v] = 1;
    mat[v][u] = 1;
  }

  for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
      if (j > 0) cout << ' ';
      cout << mat[i][j];
    }
    cout << '\n';
  }

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
```

출력

```
0 1 1 0
1 0 0 1
1 0 0 1
0 1 1 0
```
