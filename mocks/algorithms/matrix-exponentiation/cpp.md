# 행렬 거듭제곱 (피보나치) — C++

`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1e9 + 7;
using Mat = vector<vector<long long>>;

Mat matMul(const Mat& A, const Mat& B) {
  int n = A.size();
  Mat C(n, vector<long long>(n, 0));
  for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
      for (int k = 0; k < n; k++)
        C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;
  return C;
}

Mat matPow(Mat M, long long p) {
  int n = M.size();
  Mat result(n, vector<long long>(n, 0));
  for (int i = 0; i < n; i++) result[i][i] = 1;
  while (p > 0) {
    if (p & 1) result = matMul(result, M);
    p >>= 1;
    M = matMul(M, M);
  }
  return result;
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  long long n;
  cin >> n;
  if (n == 0) { cout << 0 << '\n'; return 0; }
  Mat M = {{1, 1}, {1, 0}};
  cout << matPow(M, n)[0][1] << '\n';
}
```

입력

```
10
```

출력

```
55
```
