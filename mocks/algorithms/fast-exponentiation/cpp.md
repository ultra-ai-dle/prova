# fast-exponentiation — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

long long power(long long a, long long b, long long m) {
  long long result = 1;
  a %= m;
  while (b > 0) {
    if (b & 1) result = result * a % m;
    a = a * a % m;
    b >>= 1;
  }
  return result;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  long long a, b, m; cin >> a >> b >> m;
  cout << power(a, b, m) << '\n';
}
```

입력

```
2 10 1000000007
```

출력

```
1024
```
