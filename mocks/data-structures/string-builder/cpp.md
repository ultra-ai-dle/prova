# String Builder — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int q;
  cin >> q;
  cin.ignore();
  string built = "";
  while (q--) {
    string line;
    getline(cin, line);
    size_t spaceIdx = line.find(' ');
    string cmd = (spaceIdx == string::npos) ? line : line.substr(0, spaceIdx);
    string arg = (spaceIdx == string::npos) ? "" : line.substr(spaceIdx + 1);
    if (cmd == "append") {
      built += arg;
    } else if (cmd == "prepend") {
      built = arg + built;
    } else if (cmd == "build") {
      cout << built << '\n';
    }
  }
  return 0;
}
```

입력

```
4
append hello
append  world
prepend say 
build
```

출력

```
say hello world
```
