# two-pointers — C++

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
  int t;
  cin >> t;
  int i = 0, j = n - 1;
  while (i < j) {
    int s = a[i] + a[j];
    if (s == t) {
      cout << a[i] << ' ' << a[j] << '\n';
      return 0;
    }
    if (s < t) i++;
    else j--;
  }
  cout << -1 << '\n';
}
```

입력

```
6
1 2 4 5 7 11
13
```

출력

```
2 11
```
