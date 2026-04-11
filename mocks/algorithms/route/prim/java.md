# prim — Java

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
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int k = 0; k < m; k++) {
      st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      int w = Integer.parseInt(st.nextToken());
      g.get(u).add(new int[]{w, v});
      g.get(v).add(new int[]{w, u});
    }
    boolean[] visited = new boolean[n];
    long total = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
    pq.offer(new int[]{0, 0});
    while (!pq.isEmpty()) {
      int[] cur = pq.poll();
      int cost = cur[0], u = cur[1];
      if (visited[u]) continue;
      visited[u] = true;
      total += cost;
      for (int[] e : g.get(u)) {
        if (!visited[e[1]]) pq.offer(e);
      }
    }
    StringBuilder sb = new StringBuilder();
    sb.append(total);
    System.out.print(sb);
  }
}
```

입력

```
5 7
0 1 2
0 3 6
1 2 3
1 3 8
1 4 5
2 4 7
3 4 9
```

출력

```
17
```
