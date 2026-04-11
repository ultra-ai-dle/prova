# heap-sort — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

void siftdown(vector<int>& a, int n, int i) {
  for (;;) {
    int c = 2 * i + 1;
    if (c >= n) break;
    if (c + 1 < n && a[c + 1] > a[c]) c++;
    if (a[c] > a[i]) {
      swap(a[c], a[i]);
      i = c;
    } else break;
  }
}

void heapsort(vector<int>& a) {
  int n = (int)a.size();
  for (int i = (n >> 1) - 1; i >= 0; i--) siftdown(a, n, i);
  for (int end = n - 1; end > 0; end--) {
    swap(a[0], a[end]);
    siftdown(a, end, 0);
  }
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  heapsort(a);
  for (int i = 0; i < n; i++) {
    if (i) cout << ' ';
    cout << a[i];
  }
  cout << '\n';
}
```

입력

```
5
3 1 4 1 2
```

출력

```
1 1 2 3 4
```
