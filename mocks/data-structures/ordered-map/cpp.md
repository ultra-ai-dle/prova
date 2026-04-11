# Ordered Map — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int q;
  cin >> q;
  map<int, int> m;
  while (q--) {
    string op;
    cin >> op;
    if (op == "put") {
      int k, v; cin >> k >> v;
      m[k] = v;
    } else if (op == "get") {
      int k; cin >> k;
      cout << m[k] << '\n';
    } else if (op == "remove") {
      int k; cin >> k;
      m.erase(k);
    } else if (op == "min") {
      cout << m.begin()->first << '\n';
    }
  }
  return 0;
}
```

입력

```
5
put 3 30
put 1 10
put 2 20
min
get 2
```

출력

```
1
20
```
