# upper-bound — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int upperBound(vector<int>& arr, int target) {
  int lo = 0, hi = arr.size();
  while (lo < hi) {
    int mid = (lo + hi) / 2;
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n; cin >> n;
  vector<int> arr(n);
  for (int& x : arr) cin >> x;
  int target; cin >> target;
  cout << upperBound(arr, target) << '\n';
}
```

입력

```
7
1 2 4 4 5 7 9
4
```

출력

```
4
```
