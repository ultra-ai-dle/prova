# Coin Change — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int k = Integer.parseInt(st.nextToken());
    int amount = Integer.parseInt(st.nextToken());
    st = new StringTokenizer(br.readLine());
    int[] coins = new int[k];
    for (int i = 0; i < k; i++) coins[i] = Integer.parseInt(st.nextToken());
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    dp[0] = 0;
    for (int c : coins) {
      for (int x = c; x <= amount; x++) {
        if (dp[x - c] != Integer.MAX_VALUE && dp[x - c] + 1 < dp[x]) {
          dp[x] = dp[x - c] + 1;
        }
      }
    }
    StringBuilder sb = new StringBuilder();
    sb.append(dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount]);
    System.out.print(sb);
  }
}
```

입력

```
3 11
1 5 6
```

출력

```
2
```
