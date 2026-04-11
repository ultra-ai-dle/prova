# Kosaraju — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n, m;
  cin >> n >> m;
  vector<vector<int>> graph(n), rev(n);
  for (int i = 0; i < m; i++) {
    int u, v;
    cin >> u >> v;
    graph[u].push_back(v);
    rev[v].push_back(u);
  }

  vector<bool> visited(n, false);
  vector<int> order;

  for (int i = 0; i < n; i++) {
    if (!visited[i]) {
      stack<pair<int,int>> st;
      st.push({i, 0});
      while (!st.empty()) {
        auto [node, phase] = st.top(); st.pop();
        if (phase == 0) {
          if (visited[node]) continue;
          visited[node] = true;
          st.push({node, 1});
          for (int nb : graph[node])
            if (!visited[nb]) st.push({nb, 0});
        } else {
          order.push_back(node);
        }
      }
    }
  }

  vector<bool> visited2(n, false);
  int sccCount = 0;

  for (int i = (int)order.size() - 1; i >= 0; i--) {
    int start = order[i];
    if (!visited2[start]) {
      visited2[start] = true;
      stack<int> st;
      st.push(start);
      while (!st.empty()) {
        int node = st.top(); st.pop();
        for (int nb : rev[node]) {
          if (!visited2[nb]) {
            visited2[nb] = true;
            st.push(nb);
          }
        }
      }
      sccCount++;
    }
  }

  cout << sccCount << '\n';
  return 0;
}
```

입력

```
5 6
0 1
1 2
2 0
1 3
3 4
4 3
```

출력

```
3
```
