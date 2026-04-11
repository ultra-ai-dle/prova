# algorithms/sort/bubble — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);

  int n;
  cin >> n;
  vector<int> arr(n);
  for (int i = 0; i < n; i++) cin >> arr[i];

  for (int i = 0; i < n; i++) {
    for (int j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) swap(arr[j], arr[j + 1]);
    }
  }

  for (int i = 0; i < n; i++) {
    if (i > 0) cout << ' ';
    cout << arr[i];
  }

  return 0;
}
```

입력

```
6
5 3 8 1 4 2
```

출력

```
1 2 3 4 5 8
```
