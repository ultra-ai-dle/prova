# Fibonacci — Java
`Main.java`

```java
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    StringBuilder sb = new StringBuilder();
    if (n == 0) {
      sb.append(0);
    } else {
      long[] dp = new long[n + 1];
      dp[1] = 1;
      for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
      }
      sb.append(dp[n]);
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
