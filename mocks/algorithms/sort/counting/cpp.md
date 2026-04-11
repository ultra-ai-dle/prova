# algorithms/sort/counting — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n;
  cin >> n;

  int count[101] = {};
  for (int i = 0; i < n; i++) {
    int x; cin >> x;
    count[x]++;
  }

  bool first = true;
  for (int i = 0; i <= 100; i++) {
    for (int j = 0; j < count[i]; j++) {
      if (!first) cout << ' ';
      cout << i;
      first = false;
    }
  }

  return 0;
}
```

입력

```
7
4 2 2 8 3 3 1
```

출력

```
1 2 2 3 3 4 8
```
