# sliding-window — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n, k;
  cin >> n >> k;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  long long cur = 0;
  for (int i = 0; i < k; i++) cur += a[i];
  long long best = cur;
  for (int i = k; i < n; i++) {
    cur += a[i] - a[i - k];
    best = max(best, cur);
  }
  cout << best << '\n';
}
```

입력

```
4 2
3 1 5 2
```

출력

```
7
```
