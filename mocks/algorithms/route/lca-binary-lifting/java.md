# LCA (Binary Lifting) — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static int LOG;
  static int[] depth;
  static int[][] up;
  static List<Integer>[] graph;

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    graph = new ArrayList[n];
    for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
    for (int i = 0; i < n - 1; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      graph[u].add(v);
      graph[v].add(u);
    }

    LOG = Math.max(1, (int)(Math.log(n) / Math.log(2)) + 1);
    depth = new int[n];
    up = new int[LOG][n];
    Arrays.fill(depth, -1);
    for (int[] row : up) Arrays.fill(row, -1);

    depth[0] = 0;
    up[0][0] = 0;
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(0);
    while (!stack.isEmpty()) {
      int node = stack.pop();
      for (int nb : graph[node]) {
        if (depth[nb] == -1) {
          depth[nb] = depth[node] + 1;
          up[0][nb] = node;
          stack.push(nb);
        }
      }
    }

    for (int k = 1; k < LOG; k++) {
      for (int v = 0; v < n; v++) {
        if (up[k-1][v] != -1) up[k][v] = up[k-1][up[k-1][v]];
      }
    }

    int q = Integer.parseInt(br.readLine().trim());
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < q; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      sb.append(lca(u, v)).append('\n');
    }
    System.out.print(sb);
  }

  static int lca(int u, int v) {
    if (depth[u] < depth[v]) { int t = u; u = v; v = t; }
    int diff = depth[u] - depth[v];
    for (int k = 0; k < LOG; k++) if (((diff >> k) & 1) == 1) u = up[k][u];
    if (u == v) return u;
    for (int k = LOG - 1; k >= 0; k--) {
      if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
    }
    return up[0][u];
  }
}
```

입력

```
7
0 1
0 2
1 3
1 4
2 5
2 6
3
3 4
5 6
3 5
```

출력

```
1
2
0
```
