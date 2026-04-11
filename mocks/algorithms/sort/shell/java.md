# shell-sort — Java

`Main.java`

```java
import java.io.*;

public class Main {
  static void shellSort(int[] a) {
    int n = a.length;
    int gap = 1;
    while (gap < n / 3) gap = gap * 3 + 1;
    while (gap >= 1) {
      for (int i = gap; i < n; i++) {
        int key = a[i];
        int j = i - gap;
        while (j >= 0 && a[j] > key) {
          a[j + gap] = a[j];
          j -= gap;
        }
        a[j + gap] = key;
      }
      gap /= 3;
    }
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    shellSort(a);
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
7
64 25 12 22 11 90 45
```

출력

```
11 12 22 25 45 64 90
```
