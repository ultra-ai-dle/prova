# 구간 최솟값 쿼리 (스파스 테이블) — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();

    int n = Integer.parseInt(br.readLine().trim());
    StringTokenizer st = new StringTokenizer(br.readLine());
    int[] arr = new int[n];
    for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());

    int LOG = Math.max(1, (int)(Math.log(n) / Math.log(2)) + 1);
    int[][] sparse = new int[LOG][n];
    for (int i = 0; i < n; i++) sparse[0][i] = arr[i];

    for (int j = 1; j < LOG; j++) {
      for (int i = 0; i + (1 << j) <= n; i++) {
        sparse[j][i] = Math.min(sparse[j-1][i], sparse[j-1][i + (1 << (j-1))]);
      }
    }

    int q = Integer.parseInt(br.readLine().trim());
    for (int i = 0; i < q; i++) {
      st = new StringTokenizer(br.readLine());
      int l = Integer.parseInt(st.nextToken());
      int r = Integer.parseInt(st.nextToken());
      int k = (int)(Math.log(r - l + 1) / Math.log(2));
      sb.append(Math.min(sparse[k][l], sparse[k][r - (1 << k) + 1])).append('\n');
    }

    System.out.print(sb);
  }
}
```

입력

```
7
2 4 3 1 6 7 8
3
1 5
0 6
2 4
```

출력

```
1
1
1
```
