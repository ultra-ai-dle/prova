# LCS — Java
`Main.java`

```java
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String a = br.readLine().trim();
    String b = br.readLine().trim();
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++) {
      for (int j = 1; j <= n; j++) {
        if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    StringBuilder sb = new StringBuilder();
    sb.append(dp[m][n]);
    System.out.print(sb);
  }
}
```

입력

```
ABCBDAB
BDCAB
```

출력

```
4
```
