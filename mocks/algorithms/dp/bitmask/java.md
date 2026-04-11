# Bitmask DP — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    int n = Integer.parseInt(br.readLine().trim());
    int[][] dist = new int[n][n];
    for (int i = 0; i < n; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      for (int j = 0; j < n; j++) dist[i][j] = Integer.parseInt(st.nextToken());
    }

    final int INF = Integer.MAX_VALUE / 2;
    int size = 1 << n;
    int[][] dp = new int[size][n];
    for (int[] row : dp) Arrays.fill(row, INF);
    dp[1][0] = 0;

    for (int mask = 0; mask < size; mask++) {
      for (int u = 0; u < n; u++) {
        if (dp[mask][u] == INF) continue;
        if (((mask >> u) & 1) == 0) continue;
        for (int v = 0; v < n; v++) {
          if (((mask >> v) & 1) == 1) continue;
          int nmask = mask | (1 << v);
          int cost = dp[mask][u] + dist[u][v];
          if (cost < dp[nmask][v]) dp[nmask][v] = cost;
        }
      }
    }

    int full = size - 1;
    int ans = INF;
    for (int u = 1; u < n; u++) {
      ans = Math.min(ans, dp[full][u] + dist[u][0]);
    }
    sb.append(ans).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
4
0 10 15 20
5 0 9 10
6 13 0 12
8 8 9 0
```

출력

```
35
```
