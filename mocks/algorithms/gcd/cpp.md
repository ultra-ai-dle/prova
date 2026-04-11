# gcd — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

long long gcd(long long a, long long b) {
  while (b) { a %= b; swap(a, b); }
  return a;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  long long a, b; cin >> a >> b;
  long long g = gcd(a, b);
  long long lcm = a / g * b;
  cout << g << ' ' << lcm << '\n';
}
```

입력

```
48 18
```

출력

```
6 144
```
