# Tree Diameter — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static List<int[]>[] graph;
  static int n;

  static int[] bfs(int start) {
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    dist[start] = 0;
    Queue<Integer> q = new LinkedList<>();
    q.add(start);
    while (!q.isEmpty()) {
      int u = q.poll();
      for (int[] edge : graph[u]) {
        int v = edge[0], w = edge[1];
        if (dist[v] == -1) {
          dist[v] = dist[u] + w;
          q.add(v);
        }
      }
    }
    int far = 0;
    for (int i = 1; i < n; i++) if (dist[i] > dist[far]) far = i;
    return new int[]{far, dist[far]};
  }

  @SuppressWarnings("unchecked")
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    n = Integer.parseInt(br.readLine().trim());
    graph = new List[n];
    for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
    for (int i = 0; i < n - 1; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      int w = Integer.parseInt(st.nextToken());
      graph[u].add(new int[]{v, w});
      graph[v].add(new int[]{u, w});
    }
    int far1 = bfs(0)[0];
    int diameter = bfs(far1)[1];
    sb.append(diameter).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
5
0 1 2
1 2 3
2 3 1
1 4 5
```

출력

```
9
```
