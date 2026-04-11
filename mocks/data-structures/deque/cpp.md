# deque — C++

```cpp
#include <deque>
#include <iostream>
#include <string>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int q;
  cin >> q;
  string op;
  deque<int> d;
  while (q--) {
    cin >> op;
    if (op == "push_front") {
      int x;
      cin >> x;
      d.push_front(x);
    } else if (op == "push_back") {
      int x;
      cin >> x;
      d.push_back(x);
    } else if (op == "pop_front") {
      cout << d.front() << '\n';
      d.pop_front();
    } else {
      cout << d.back() << '\n';
      d.pop_back();
    }
  }
}
```

입력

```
6
push_back 1
push_back 2
push_front 0
pop_front
pop_back
pop_front
```

출력

```
0
2
1
```
