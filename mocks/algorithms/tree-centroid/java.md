# algorithms/tree-centroid — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    List<Integer>[] adj = new List[n];
    for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
    for (int i = 0; i < n - 1; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      adj[u].add(v);
      adj[v].add(u);
    }

    int[] size = new int[n];
    Arrays.fill(size, 1);
    int[] parent = new int[n];
    Arrays.fill(parent, -1);
    int[] order = new int[n];
    int idx = 0;
    boolean[] visited = new boolean[n];
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(0);
    visited[0] = true;
    while (!stack.isEmpty()) {
      int u = stack.pop();
      order[idx++] = u;
      for (int v : adj[u]) {
        if (!visited[v]) {
          visited[v] = true;
          parent[v] = u;
          stack.push(v);
        }
      }
    }
    for (int i = n - 1; i >= 0; i--) {
      int u = order[i];
      if (parent[u] != -1) size[parent[u]] += size[u];
    }

    List<Integer> result = new ArrayList<>();
    for (int u = 0; u < n; u++) {
      int maxComp = n - size[u];
      for (int v : adj[u]) {
        if (size[v] < size[u]) maxComp = Math.max(maxComp, size[v]);
      }
      if (maxComp <= n / 2) result.add(u);
    }
    Collections.sort(result);

    StringBuilder sb = new StringBuilder();
    for (int c : result) sb.append(c).append('\n');
    System.out.print(sb);
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
```

출력

```
0
```
