# sliding-window — Java

`Main.java`

```java
import java.io.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] nk = br.readLine().split("\\s+");
    int n = Integer.parseInt(nk[0]);
    int k = Integer.parseInt(nk[1]);
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    long cur = 0;
    for (int i = 0; i < k; i++) cur += a[i];
    long best = cur;
    for (int i = k; i < n; i++) {
      cur += a[i] - a[i - k];
      if (cur > best) best = cur;
    }
    System.out.println(best);
  }
}
```

입력

```
4 2
3 1 5 2
```

출력

```
7
```
