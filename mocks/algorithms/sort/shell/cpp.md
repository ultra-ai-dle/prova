# shell-sort — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

void shellSort(vector<int>& a) {
  int n = (int)a.size();
  int gap = 1;
  while (gap < n / 3) gap = gap * 3 + 1;
  while (gap >= 1) {
    for (int i = gap; i < n; i++) {
      int key = a[i];
      int j = i - gap;
      while (j >= 0 && a[j] > key) {
        a[j + gap] = a[j];
        j -= gap;
      }
      a[j + gap] = key;
    }
    gap /= 3;
  }
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  shellSort(a);
  for (int i = 0; i < n; i++) {
    if (i) cout << ' ';
    cout << a[i];
  }
  cout << '\n';
}
```

입력

```
7
64 25 12 22 11 90 45
```

출력

```
11 12 22 25 45 64 90
```
