# floyd-warshall — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int m = Integer.parseInt(st.nextToken());
    final int INF = 1_000_000_000;
    int[][] d = new int[n][n];
    for (int[] row : d) Arrays.fill(row, INF);
    for (int i = 0; i < n; i++) d[i][i] = 0;
    for (int k = 0; k < m; k++) {
      st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      int w = Integer.parseInt(st.nextToken());
      d[u][v] = Math.min(d[u][v], w);
    }
    for (int k = 0; k < n; k++) {
      for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
          if (d[i][k] != INF && d[k][j] != INF && d[i][k] + d[k][j] < d[i][j]) {
            d[i][j] = d[i][k] + d[k][j];
          }
        }
      }
    }
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) {
      for (int j = 0; j < n; j++) {
        if (j > 0) sb.append(' ');
        sb.append(d[i][j] == INF ? "INF" : d[i][j]);
      }
      sb.append('\n');
    }
    System.out.print(sb);
  }
}
```

입력

```
4 5
0 1 3
0 3 7
1 2 2
2 3 1
3 0 6
```

출력

```
0 3 5 6
INF 0 2 3
INF INF 0 1
6 9 11 0
```
