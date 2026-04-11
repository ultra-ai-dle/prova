# LIS — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> arr(n), tails;
  for (int i = 0; i < n; i++) cin >> arr[i];
  for (int x : arr) {
    auto it = lower_bound(tails.begin(), tails.end(), x);
    if (it == tails.end()) tails.push_back(x);
    else *it = x;
  }
  cout << tails.size();
  return 0;
}
```

입력

```
8
3 1 4 1 5 9 2 6
```

출력

```
4
```
