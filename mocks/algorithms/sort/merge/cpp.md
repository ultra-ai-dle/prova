# merge-sort — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

vector<int> merge_sort(const vector<int>& a, int lo, int hi) {
  if (hi - lo <= 1) return vector<int>(a.begin() + lo, a.begin() + hi);
  int mid = (lo + hi) >> 1;
  vector<int> left = merge_sort(a, lo, mid);
  vector<int> right = merge_sort(a, mid, hi);
  vector<int> res;
  size_t i = 0, j = 0;
  while (i < left.size() && j < right.size()) {
    if (left[i] <= right[j]) res.push_back(left[i++]);
    else res.push_back(right[j++]);
  }
  while (i < left.size()) res.push_back(left[i++]);
  while (j < right.size()) res.push_back(right[j++]);
  return res;
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];
  vector<int> s = merge_sort(a, 0, n);
  for (int i = 0; i < n; i++) {
    if (i) cout << ' ';
    cout << s[i];
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
