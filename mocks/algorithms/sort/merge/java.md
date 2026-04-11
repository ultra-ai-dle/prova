# merge-sort — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int[] mergeSort(int[] a, int lo, int hi) {
    if (hi - lo <= 1) return Arrays.copyOfRange(a, lo, hi);
    int mid = (lo + hi) >>> 1;
    int[] left = mergeSort(a, lo, mid);
    int[] right = mergeSort(a, mid, hi);
    int[] res = new int[left.length + right.length];
    int i = 0, j = 0, k = 0;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) res[k++] = left[i++];
      else res[k++] = right[j++];
    }
    while (i < left.length) res[k++] = left[i++];
    while (j < right.length) res[k++] = right[j++];
    return res;
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    int[] s = mergeSort(a, 0, n);
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < s.length; i++) {
      if (i > 0) sb.append(' ');
      sb.append(s[i]);
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
