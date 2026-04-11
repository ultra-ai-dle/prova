# 모듈러 역원 — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

long long modPow(long long base, long long exp, long long mod) {
  long long result = 1;
  base %= mod;
  while (exp > 0) {
    if (exp & 1) result = result * base % mod;
    exp >>= 1;
    base = base * base % mod;
  }
  return result;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  long long a, m;
  cin >> a >> m;
  cout << modPow(a, m - 2, m) << '\n';
}
```

입력

```
3 7
```

출력

```
5
```
