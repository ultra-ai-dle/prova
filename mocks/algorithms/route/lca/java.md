# LCA — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static int[] depth, parent;
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

    depth = new int[n];
    parent = new int[n];
    Arrays.fill(depth, -1);
    Arrays.fill(parent, -1);
    depth[0] = 0;
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(0);
    while (!stack.isEmpty()) {
      int node = stack.pop();
      for (int nb : graph[node]) {
        if (depth[nb] == -1) {
          depth[nb] = depth[node] + 1;
          parent[nb] = node;
          stack.push(nb);
        }
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
    while (depth[u] > depth[v]) u = parent[u];
    while (depth[v] > depth[u]) v = parent[v];
    while (u != v) { u = parent[u]; v = parent[v]; }
    return u;
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
