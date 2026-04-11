# monotonic-queue — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n, k;
  cin >> n >> k;
  vector<int> arr(n);
  for (int& x : arr) cin >> x;
  deque<int> dq;
  bool first = true;
  for (int i = 0; i < n; i++) {
    while (!dq.empty() && dq.front() < i - k + 1) dq.pop_front();
    while (!dq.empty() && arr[dq.back()] < arr[i]) dq.pop_back();
    dq.push_back(i);
    if (i >= k - 1) {
      if (!first) cout << ' ';
      cout << arr[dq.front()];
      first = false;
    }
  }
  cout << '\n';
  return 0;
}
```

입력

```
8 3
1 3 -1 -3 5 3 6 7
```

출력

```
3 3 5 5 6 7
```
