# radix-sort — Java

`Main.java`

```java
import java.io.*;

public class Main {
  static void radixSort(int[] a) {
    int max = a[0];
    for (int v : a) if (v > max) max = v;
    for (int exp = 1; max / exp > 0; exp *= 10) {
      int[] out = new int[a.length];
      int[] cnt = new int[10];
      for (int v : a) cnt[(v / exp) % 10]++;
      for (int i = 1; i < 10; i++) cnt[i] += cnt[i - 1];
      for (int i = a.length - 1; i >= 0; i--) out[--cnt[(a[i] / exp) % 10]] = a[i];
      System.arraycopy(out, 0, a, 0, a.length);
    }
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    radixSort(a);
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) {
      if (i > 0) sb.append(' ');
      sb.append(a[i]);
    }
    System.out.print(sb);
  }
}
```

입력

```
6
170 45 75 90 802 24
```

출력

```
24 45 75 90 170 802
```
