# algorithms/dp/knapsack-unbounded — Java

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
    int[] w = new int[n], v = new int[n];
    for (int i = 0; i < n; i++) {
      st = new StringTokenizer(br.readLine());
      w[i] = Integer.parseInt(st.nextToken());
      v[i] = Integer.parseInt(st.nextToken());
    }
    int[] dp = new int[W + 1];
    for (int c = 1; c <= W; c++) {
      for (int i = 0; i < n; i++) {
        if (w[i] <= c) {
          dp[c] = Math.max(dp[c], dp[c - w[i]] + v[i]);
        }
      }
    }
    StringBuilder sb = new StringBuilder();
    sb.append(dp[W]).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
4 8
2 3
3 4
4 5
5 6
```

출력

```
12
```
