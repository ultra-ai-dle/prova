# quicksort — C++

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int partition(vector<int>& a, int lo, int hi) {
  int p = a[hi], i = lo;
  for (int j = lo; j < hi; j++) {
    if (a[j] <= p) swap(a[i++], a[j]);
  }
  swap(a[i], a[hi]);
  return i;
}

void qsort(vector<int>& a, int lo, int hi) {
  if (lo < hi) {
    int q = partition(a, lo, hi);
    qsort(a, lo, q - 1);
    qsort(a, q + 1, hi);
  }
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  qsort(a, 0, n - 1);
  for (int i = 0; i < n; i++) {
    if (i) cout << ' ';
    cout << a[i];
  }
  cout << '\n';
}
```

입력

```
4
3 1 4 2
```

출력

```
1 2 3 4
```
