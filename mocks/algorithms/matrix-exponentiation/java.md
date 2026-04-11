# 행렬 거듭제곱 (피보나치) — Java

`Main.java`

```java
import java.io.*;

public class Main {
  static final long MOD = 1_000_000_007L;

  static long[][] matMul(long[][] A, long[][] B) {
    int n = A.length;
    long[][] C = new long[n][n];
    for (int i = 0; i < n; i++)
      for (int j = 0; j < n; j++)
        for (int k = 0; k < n; k++)
          C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;
    return C;
  }

  static long[][] matPow(long[][] M, long p) {
    int n = M.length;
    long[][] result = new long[n][n];
    for (int i = 0; i < n; i++) result[i][i] = 1;
    while (p > 0) {
      if ((p & 1) == 1) result = matMul(result, M);
      p >>= 1;
      M = matMul(M, M);
    }
    return result;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    long n = Long.parseLong(br.readLine().trim());
    StringBuilder sb = new StringBuilder();
    if (n == 0) {
      sb.append(0);
    } else {
      long[][] M = {{1, 1}, {1, 0}};
      sb.append(matPow(M, n)[0][1]);
    }
    System.out.print(sb);
  }
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
