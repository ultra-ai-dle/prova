# topological-sort — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] nm = br.readLine().split("\\s+");
    int n = Integer.parseInt(nm[0]);
    int m = Integer.parseInt(nm[1]);
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int k = 0; k < m; k++) {
      String[] uv = br.readLine().split("\\s+");
      int u = Integer.parseInt(uv[0]);
      int v = Integer.parseInt(uv[1]);
      g.get(u).add(v);
      indeg[v]++;
    }
    for (int i = 0; i < n; i++) Collections.sort(g.get(i));
    PriorityQueue<Integer> q = new PriorityQueue<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
    StringBuilder sb = new StringBuilder();
    while (!q.isEmpty()) {
      int u = q.poll();
      if (sb.length() > 0) sb.append(' ');
      sb.append(u);
      for (int v : g.get(u)) {
        indeg[v]--;
        if (indeg[v] == 0) q.offer(v);
      }
    }
    System.out.println(sb);
  }
}
```

입력

```
4 4
0 1
0 2
1 3
2 3
```

출력

```
0 1 2 3
```
