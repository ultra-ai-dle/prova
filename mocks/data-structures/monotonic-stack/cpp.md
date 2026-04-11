# monotonic-stack — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  int n;
  cin >> n;
  vector<int> arr(n);
  for (int& x : arr) cin >> x;
  vector<int> result(n, -1);
  stack<int> st;
  for (int i = 0; i < n; i++) {
    while (!st.empty() && arr[st.top()] < arr[i]) {
      result[st.top()] = i;
      st.pop();
    }
    st.push(i);
  }
  for (int i = 0; i < n; i++) {
    if (i > 0) cout << ' ';
    cout << result[i];
  }
  cout << '\n';
  return 0;
}
```

입력

```
6
2 1 5 6 2 3
```

출력

```
2 2 3 -1 5 -1
```
