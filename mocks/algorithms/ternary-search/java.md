# ternary-search — Java

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
    int lo = 0, hi = n - 1;
    while (hi - lo > 2) {
      int m1 = lo + (hi - lo) / 3;
      int m2 = hi - (hi - lo) / 3;
      if (a[m1] < a[m2]) lo = m1;
      else hi = m2;
    }
    int idx = lo;
    for (int i = lo + 1; i <= hi; i++) {
      if (a[i] > a[idx]) idx = i;
    }
    StringBuilder sb = new StringBuilder();
    sb.append(idx);
    System.out.print(sb);
  }
}
```

입력

```
9
1 3 6 7 9 8 5 2 1
```

출력

```
4
```
