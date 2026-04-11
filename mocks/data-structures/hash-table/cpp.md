# hash-table — C++

`std::unordered_map<string,int>`

```cpp
#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int q;
  cin >> q;
  cin.ignore();
  unordered_map<string, int> d;
  while (q--) {
    string op, k;
    cin >> op >> k;
    if (op == "set") {
      int v;
      cin >> v;
      d[k] = v;
    } else {
      auto it = d.find(k);
      cout << (it == d.end() ? 0 : it->second) << '\n';
    }
  }
}
```

입력

```
6
set a 10
get a
set b 20
get b
set a 30
get a
```

출력

```
10
20
30
```
