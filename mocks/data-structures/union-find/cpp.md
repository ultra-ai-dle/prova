# union-find — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

struct DSU {
  vector<int> p;
  DSU(int n) : p(n) {
    for (int i = 0; i < n; i++) p[i] = i;
  }
  int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
  void unite(int a, int b) {
    a = find(a);
    b = find(b);
    if (a != b) p[a] = b;
  }
};

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, m;
  cin >> n >> m;
  DSU d(n);
  for (int k = 0; k < m; k++) {
    int a, b;
    cin >> a >> b;
    d.unite(a, b);
  }
  cout << (d.find(0) == d.find(n - 1) ? 1 : 0) << '\n';
}
```

입력

```
3 2
0 1
1 2
```

출력

```
1
```
