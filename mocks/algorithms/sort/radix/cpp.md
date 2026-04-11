# radix-sort — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

void radixSort(vector<int>& a) {
  int mx = *max_element(a.begin(), a.end());
  for (int exp = 1; mx / exp > 0; exp *= 10) {
    vector<int> out(a.size());
    int cnt[10] = {};
    for (int v : a) cnt[(v / exp) % 10]++;
    for (int i = 1; i < 10; i++) cnt[i] += cnt[i - 1];
    for (int i = (int)a.size() - 1; i >= 0; i--) out[--cnt[(a[i] / exp) % 10]] = a[i];
    a = out;
  }
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  radixSort(a);
  for (int i = 0; i < n; i++) {
    if (i) cout << ' ';
    cout << a[i];
  }
  cout << '\n';
}
```

입력

```
6
170 45 75 90 802 24
```

출력

```
24 45 75 90 170 802
```
