# quicksort — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int partition(int[] a, int lo, int hi) {
    int p = a[hi], i = lo;
    for (int j = lo; j < hi; j++) {
      if (a[j] <= p) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
        i++;
      }
    }
    int t = a[i];
    a[i] = a[hi];
    a[hi] = t;
    return i;
  }

  static void qsort(int[] a, int lo, int hi) {
    if (lo < hi) {
      int q = partition(a, lo, hi);
      qsort(a, lo, q - 1);
      qsort(a, q + 1, hi);
    }
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    qsort(a, 0, n - 1);
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) {
      if (i > 0) sb.append(' ');
      sb.append(a[i]);
    }
    System.out.println(sb);
  }
}
```

입력

```
4
3 1 4 2
```

출력

```
1 2 3 4
```
