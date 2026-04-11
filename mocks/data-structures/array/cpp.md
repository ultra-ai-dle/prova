# Array — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int n;
  cin >> n;
  vector<int> arr(n);
  for (int i = 0; i < n; i++) cin >> arr[i];

  int q;
  cin >> q;
  while (q--) {
    string op;
    cin >> op;
    if (op == "get") {
      int i; cin >> i;
      cout << arr[i] << '\n';
    } else if (op == "set") {
      int i, v; cin >> i >> v;
      arr[i] = v;
    } else if (op == "print") {
      for (int i = 0; i < n; i++) {
        if (i > 0) cout << ' ';
        cout << arr[i];
      }
      cout << '\n';
    }
  }
  return 0;
}
```

입력

```
5
1 2 3 4 5
4
get 2
set 2 99
get 2
print
```

출력

```
3
99
1 2 99 4 5
```
