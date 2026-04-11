# 정수 집합 비트셋 — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n; cin >> n;
  bitset<64> bits;

  int q; cin >> q;
  string op;
  while (q--) {
    cin >> op;
    if (op == "set") {
      int i; cin >> i; bits.set(i);
    } else if (op == "clear") {
      int i; cin >> i; bits.reset(i);
    } else if (op == "flip") {
      int i; cin >> i; bits.flip(i);
    } else if (op == "get") {
      int i; cin >> i; cout << bits[i] << '\n';
    } else if (op == "count") {
      cout << bits.count() << '\n';
    }
  }

  return 0;
}
```

입력

```
64
5
set 3
set 7
flip 3
get 3
count
```

출력

```
0
1
```
