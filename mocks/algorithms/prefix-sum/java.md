# prefix-sum — Java

`Main.java`

```java
import java.io.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    long[] ps = new long[n + 1];
    for (int i = 0; i < n; i++) ps[i + 1] = ps[i] + a[i];
    int q = Integer.parseInt(br.readLine());
    StringBuilder sb = new StringBuilder();
    for (int k = 0; k < q; k++) {
      String[] lr = br.readLine().split("\\s+");
      int l = Integer.parseInt(lr[0]);
      int r = Integer.parseInt(lr[1]);
      sb.append(ps[r] - ps[l - 1]).append('\n');
    }
    System.out.print(sb);
  }
}
```

입력

```
5
2 1 3 0 4
1
1 3
```

출력

```
6
```
