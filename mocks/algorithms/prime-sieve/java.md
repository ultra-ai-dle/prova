# prime-sieve — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    boolean[] sieve = new boolean[n + 1];
    Arrays.fill(sieve, true);
    sieve[0] = sieve[1] = false;
    for (int i = 2; (long) i * i <= n; i++) {
      if (sieve[i]) {
        for (int j = i * i; j <= n; j += i) sieve[j] = false;
      }
    }
    StringBuilder sb = new StringBuilder();
    for (int i = 2; i <= n; i++) {
      if (sieve[i]) {
        if (sb.length() > 0) sb.append(' ');
        sb.append(i);
      }
    }
    sb.append('\n');
    System.out.print(sb);
  }
}
```

입력

```
30
```

출력

```
2 3 5 7 11 13 17 19 23 29
```
