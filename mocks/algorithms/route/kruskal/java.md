# kruskal — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int[] p;

  static int find(int x) {
    if (p[x] != x) p[x] = find(p[x]);
    return p[x];
  }

  static boolean union(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return false;
    p[ra] = rb;
    return true;
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] nm = br.readLine().split("\\s+");
    int n = Integer.parseInt(nm[0]);
    int m = Integer.parseInt(nm[1]);
    int[][] edges = new int[m][3];
    for (int k = 0; k < m; k++) {
      String[] e = br.readLine().split("\\s+");
      edges[k][0] = Integer.parseInt(e[2]);
      edges[k][1] = Integer.parseInt(e[0]);
      edges[k][2] = Integer.parseInt(e[1]);
    }
    Arrays.sort(edges, Comparator.comparingInt(a -> a[0]));
    p = new int[n];
    for (int i = 0; i < n; i++) p[i] = i;
    int total = 0;
    for (int[] e : edges) {
      if (union(e[1], e[2])) total += e[0];
    }
    System.out.println(total);
  }
}
```

입력

```
3 3
0 1 1
1 2 2
0 2 3
```

출력

```
3
```
