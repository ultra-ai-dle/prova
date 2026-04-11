# Dynamic Array — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int q;
  cin >> q;
  vector<int> arr;
  while (q--) {
    string op;
    cin >> op;
    if (op == "push") {
      int v; cin >> v;
      arr.push_back(v);
    } else if (op == "pop") {
      cout << arr.back() << '\n';
      arr.pop_back();
    } else if (op == "get") {
      int i; cin >> i;
      cout << arr[i] << '\n';
    } else if (op == "size") {
      cout << arr.size() << '\n';
    }
  }
  return 0;
}
```

입력

```
6
push 10
push 20
push 30
pop
size
get 0
```

출력

```
30
2
10
```
