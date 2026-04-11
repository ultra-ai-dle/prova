# ternary-search — C++

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
  int lo = 0, hi = n - 1;
  while (hi - lo > 2) {
    int m1 = lo + (hi - lo) / 3;
    int m2 = hi - (hi - lo) / 3;
    if (a[m1] < a[m2]) lo = m1;
    else hi = m2;
  }
  int idx = lo;
  for (int i = lo + 1; i <= hi; i++) {
    if (a[i] > a[idx]) idx = i;
  }
  cout << idx << '\n';
}
```

입력

```
9
1 3 6 7 9 8 5 2 1
```

출력

```
4
```
