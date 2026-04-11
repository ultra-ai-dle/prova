# stack — C++

```cpp
#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int q;
  cin >> q;
  string op;
  stack<int> s;
  while (q--) {
    cin >> op;
    if (op == "push") {
      int x;
      cin >> x;
      s.push(x);
    } else {
      cout << s.top() << '\n';
      s.pop();
    }
  }
}
```

입력

```
6
push 1
push 2
pop
push 3
pop
pop
```

출력

```
2
3
1
```
