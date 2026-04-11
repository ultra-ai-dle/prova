# dijkstra — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] head = br.readLine().split("\\s+");
    int n = Integer.parseInt(head[0]);
    int s = Integer.parseInt(head[1]);
    int t = Integer.parseInt(head[2]);
    int m = Integer.parseInt(head[3]);
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int k = 0; k < m; k++) {
      String[] e = br.readLine().split("\\s+");
      int u = Integer.parseInt(e[0]);
      int v = Integer.parseInt(e[1]);
      int w = Integer.parseInt(e[2]);
      g.get(u).add(new int[] {v, w});
    }
    final int INF = 1_000_000_000;
    int[] d = new int[n];
    Arrays.fill(d, INF);
    d[s] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
    pq.offer(new int[] {0, s});
    while (!pq.isEmpty()) {
      int[] cur = pq.poll();
      int du = cur[0], u = cur[1];
      if (du != d[u]) continue;
      for (int[] e : g.get(u)) {
        int v = e[0], w = e[1];
        if (du + w < d[v]) {
          d[v] = du + w;
          pq.offer(new int[] {d[v], v});
        }
      }
    }
    System.out.println(d[t]);
  }
}
```

입력

```
3 0 1 3
0 1 4
0 2 1
2 1 2
```

출력

```
3
```
