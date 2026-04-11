# prefix-sum — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<long long> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  vector<long long> ps(n + 1);
  for (int i = 0; i < n; i++) ps[i + 1] = ps[i] + a[i];
  int q;
  cin >> q;
  while (q--) {
    int l, r;
    cin >> l >> r;
    cout << ps[r] - ps[l - 1] << '\n';
  }
}
```

입력

```
5
2 1 3 0 4
1
1 3
```

출력

```
6
```
