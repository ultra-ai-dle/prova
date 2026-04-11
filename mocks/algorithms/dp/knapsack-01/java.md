# Knapsack 0-1 — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int W = Integer.parseInt(st.nextToken());
    long[] dp = new long[W + 1];
    for (int i = 0; i < n; i++) {
      st = new StringTokenizer(br.readLine());
      int w = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      for (int c = W; c >= w; c--) {
        dp[c] = Math.max(dp[c], dp[c - w] + v);
      }
    }
    StringBuilder sb = new StringBuilder();
    sb.append(dp[W]);
    System.out.print(sb);
  }
}
```

입력

```
4 5
2 3
3 4
4 5
5 6
```

출력

```
7
```
