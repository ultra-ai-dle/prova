# Rabin-Karp — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String t = br.readLine().trim();
    String p = br.readLine().trim();
    final long BASE = 31L;
    final long MOD = 1_000_000_007L;
    int n = t.length(), m = p.length();
    List<Integer> result = new ArrayList<>();
    if (m <= n) {
      long pw = 1L;
      for (int i = 0; i < m - 1; i++) pw = pw * BASE % MOD;
      long ph = 0L, th = 0L;
      for (int i = 0; i < m; i++) {
        ph = (ph * BASE + p.charAt(i)) % MOD;
        th = (th * BASE + t.charAt(i)) % MOD;
      }
      for (int i = 0; i <= n - m; i++) {
        if (th == ph && t.substring(i, i + m).equals(p)) result.add(i);
        if (i < n - m) {
          th = (th - t.charAt(i) * pw % MOD + MOD) % MOD;
          th = (th * BASE + t.charAt(i + m)) % MOD;
        }
      }
    }
    StringBuilder sb = new StringBuilder();
    if (result.isEmpty()) {
      sb.append(-1);
    } else {
      for (int i = 0; i < result.size(); i++) {
        if (i > 0) sb.append(' ');
        sb.append(result.get(i));
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
GEEKS FOR GEEKS
GEEKS
```

출력

```
0 10
```
