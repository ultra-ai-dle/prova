# 확장 유클리드 알고리즘 — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

tuple<long long, long long, long long> extendedGcd(long long a, long long b) {
  if (b == 0) return {a, 1, 0};
  auto [g, x, y] = extendedGcd(b, a % b);
  return {g, y, x - (a / b) * y};
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  long long a, b;
  cin >> a >> b;
  auto [g, x, y] = extendedGcd(a, b);
  cout << g << ' ' << x << ' ' << y << '\n';
}
```

입력

```
35 15
```

출력

```
5 1 -2
```
