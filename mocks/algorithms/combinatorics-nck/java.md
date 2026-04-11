# 이항 계수 C(n, k) mod 1e9+7 — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int k = Integer.parseInt(st.nextToken());
    long MOD = 1_000_000_007L;

    long[][] dp = new long[n + 1][n + 1];
    for (int i = 0; i <= n; i++) {
      dp[i][0] = 1;
      for (int j = 1; j <= i; j++) {
        dp[i][j] = (dp[i-1][j-1] + dp[i-1][j]) % MOD;
      }
    }

    StringBuilder sb = new StringBuilder();
    sb.append(dp[n][k]);
    System.out.print(sb);
  }
}
```

입력

```
10 3
```

출력

```
120
```
