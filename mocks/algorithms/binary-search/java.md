# binary-search — Java

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
    int x = Integer.parseInt(br.readLine());
    int lo = 0, hi = n;
    while (lo < hi) {
      int mid = (lo + hi) >>> 1;
      if (a[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    System.out.println(lo);
  }
}
```

입력

```
6
1 3 5 7 9 11
6
```

출력

```
3
```
