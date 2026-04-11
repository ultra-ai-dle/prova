# bfs — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] nms = br.readLine().split("\\s+");
    int n = Integer.parseInt(nms[0]);
    int m = Integer.parseInt(nms[1]);
    int st = Integer.parseInt(nms[2]);
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int k = 0; k < m; k++) {
      String[] ab = br.readLine().split("\\s+");
      int a = Integer.parseInt(ab[0]);
      int b = Integer.parseInt(ab[1]);
      g.get(a).add(b);
      g.get(b).add(a);
    }
    for (int i = 0; i < n; i++) Collections.sort(g.get(i));
    boolean[] seen = new boolean[n];
    Queue<Integer> q = new ArrayDeque<>();
    seen[st] = true;
    q.offer(st);
    StringBuilder sb = new StringBuilder();
    while (!q.isEmpty()) {
      int u = q.poll();
      if (sb.length() > 0) sb.append(' ');
      sb.append(u);
      for (int v : g.get(u)) {
        if (!seen[v]) {
          seen[v] = true;
          q.offer(v);
        }
      }
    }
    System.out.println(sb);
  }
}
```

입력

```
3 3 0
0 1
0 2
1 2
```

출력

```
0 1 2
```
