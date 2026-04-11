# queue — C++

```cpp
#include <iostream>
#include <queue>
#include <string>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int q;
  cin >> q;
  string op;
  queue<int> dq;
  while (q--) {
    cin >> op;
    if (op == "push") {
      int x;
      cin >> x;
      dq.push(x);
    } else {
      cout << dq.front() << '\n';
      dq.pop();
    }
  }
}
```

입력

```
5
push 1
push 2
pop
push 3
pop
```

출력

```
1
2
```
