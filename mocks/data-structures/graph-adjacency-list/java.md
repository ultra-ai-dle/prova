# graph-adjacency-list — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int m = Integer.parseInt(st.nextToken());
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int i = 0; i < m; i++) {
      st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      graph.get(u).add(v);
      graph.get(v).add(u);
    }
    int u = Integer.parseInt(br.readLine().trim());
    Collections.sort(graph.get(u));
    for (int i = 0; i < graph.get(u).size(); i++) {
      if (i > 0) sb.append(' ');
      sb.append(graph.get(u).get(i));
    }
    System.out.print(sb);
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
0
```

출력

```
1 2
```
