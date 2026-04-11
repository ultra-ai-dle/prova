# bellman-ford — Java

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
    int s = Integer.parseInt(st.nextToken());
    int[][] edges = new int[m][3];
    for (int k = 0; k < m; k++) {
      st = new StringTokenizer(br.readLine());
      edges[k][0] = Integer.parseInt(st.nextToken());
      edges[k][1] = Integer.parseInt(st.nextToken());
      edges[k][2] = Integer.parseInt(st.nextToken());
    }
    final int INF = 1_000_000_000;
    int[] d = new int[n];
    Arrays.fill(d, INF);
    d[s] = 0;
    for (int i = 0; i < n - 1; i++) {
      for (int[] e : edges) {
        int u = e[0], v = e[1], w = e[2];
        if (d[u] != INF && d[u] + w < d[v]) d[v] = d[u] + w;
      }
    }
    for (int[] e : edges) {
      int u = e[0], v = e[1], w = e[2];
      if (d[u] != INF && d[u] + w < d[v]) {
        System.out.print("NEGATIVE CYCLE");
        return;
      }
    }
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) {
      if (i > 0) sb.append(' ');
      sb.append(d[i] == INF ? "INF" : d[i]);
    }
    System.out.print(sb);
  }
}
```

입력

```
5 7 0
0 1 6
0 2 7
1 2 8
1 3 5
1 4 -4
2 4 9
3 1 -2
```

출력

```
0 2 7 4 -2
```
