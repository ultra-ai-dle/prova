# binary-search — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  int x;
  cin >> x;
  int lo = 0, hi = n;
  while (lo < hi) {
    int mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  cout << lo << '\n';
}
```

입력

```
6
1 3 5 7 9 11
6
```

출력

```
3
```
