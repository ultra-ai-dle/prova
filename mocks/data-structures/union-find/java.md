# union-find — Java

`Main.java`

```java
import java.io.*;

public class Main {
  static int[] p;

  static int find(int x) {
    if (p[x] != x) p[x] = find(p[x]);
    return p[x];
  }

  static void union(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra != rb) p[ra] = rb;
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] nm = br.readLine().split("\\s+");
    int n = Integer.parseInt(nm[0]);
    int m = Integer.parseInt(nm[1]);
    p = new int[n];
    for (int i = 0; i < n; i++) p[i] = i;
    for (int k = 0; k < m; k++) {
      String[] ab = br.readLine().split("\\s+");
      union(Integer.parseInt(ab[0]), Integer.parseInt(ab[1]));
    }
    System.out.println(find(0) == find(n - 1) ? 1 : 0);
  }
}
```

입력

```
3 2
0 1
1 2
```

출력

```
1
```
