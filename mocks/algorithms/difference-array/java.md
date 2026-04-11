# difference-array — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int q = Integer.parseInt(st.nextToken());
    long[] diff = new long[n + 1];
    for (int i = 0; i < q; i++) {
      st = new StringTokenizer(br.readLine());
      int l = Integer.parseInt(st.nextToken());
      int r = Integer.parseInt(st.nextToken());
      long v = Long.parseLong(st.nextToken());
      diff[l] += v;
      if (r + 1 <= n) diff[r + 1] -= v;
    }
    long[] arr = new long[n];
    arr[0] = diff[0];
    for (int i = 1; i < n; i++) arr[i] = arr[i - 1] + diff[i];
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) {
      if (i > 0) sb.append(' ');
      sb.append(arr[i]);
    }
    sb.append('\n');
    System.out.print(sb);
  }
}
```

입력

```
6 3
1 3 2
2 5 3
0 1 4
```

출력

```
4 6 5 5 3 0
```
