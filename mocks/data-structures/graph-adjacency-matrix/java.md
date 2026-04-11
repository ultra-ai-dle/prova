# 무방향 그래프 인접 행렬 — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();

    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int m = Integer.parseInt(st.nextToken());
    int[][] mat = new int[n][n];

    for (int i = 0; i < m; i++) {
      st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      mat[u][v] = 1;
      mat[v][u] = 1;
    }

    for (int i = 0; i < n; i++) {
      for (int j = 0; j < n; j++) {
        if (j > 0) sb.append(' ');
        sb.append(mat[i][j]);
      }
      sb.append('\n');
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
```

출력

```
0 1 1 0
1 0 0 1
1 0 0 1
0 1 1 0
```
