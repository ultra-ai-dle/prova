# Hash Set — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int q;
  cin >> q;
  unordered_set<int> s;
  while (q--) {
    string op;
    cin >> op;
    if (op == "add") {
      int v; cin >> v;
      s.insert(v);
    } else if (op == "remove") {
      int v; cin >> v;
      s.erase(v);
    } else if (op == "contains") {
      int v; cin >> v;
      cout << (s.count(v) ? 1 : 0) << '\n';
    } else if (op == "size") {
      cout << s.size() << '\n';
    }
  }
  return 0;
}
```

입력

```
6
add 5
add 3
add 5
contains 5
remove 5
contains 5
```

출력

```
1
0
```
