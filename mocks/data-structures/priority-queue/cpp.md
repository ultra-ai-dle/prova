# priority-queue — C++

`std::priority_queue` — 기본 max-heap → **min** 은 `greater<int>`.

```cpp
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  priority_queue<int, vector<int>, greater<int>> pq;
  for (int i = 0; i < n; i++) {
    int x;
    cin >> x;
    pq.push(x);
  }
  bool first = true;
  while (!pq.empty()) {
    if (!first) cout << ' ';
    first = false;
    cout << pq.top();
    pq.pop();
  }
  cout << '\n';
}
```

입력

```
3
3 1 2
```

출력

```
1 2 3
```
