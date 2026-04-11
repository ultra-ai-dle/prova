# heap-sort — Java

`Main.java`

```java
import java.io.*;

public class Main {
  static void siftdown(int[] a, int n, int i) {
    for (;;) {
      int c = 2 * i + 1;
      if (c >= n) break;
      if (c + 1 < n && a[c + 1] > a[c]) c++;
      if (a[c] > a[i]) {
        int t = a[c];
        a[c] = a[i];
        a[i] = t;
        i = c;
      } else break;
    }
  }

  static void heapsort(int[] a) {
    int n = a.length;
    for (int i = (n >> 1) - 1; i >= 0; i--) siftdown(a, n, i);
    for (int end = n - 1; end > 0; end--) {
      int t = a[0];
      a[0] = a[end];
      a[end] = t;
      siftdown(a, end, 0);
    }
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    heapsort(a);
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
5
3 1 4 1 2
```

출력

```
1 1 2 3 4
```
