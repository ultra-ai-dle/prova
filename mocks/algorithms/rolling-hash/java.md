# Rolling Hash — Java

`Main.java`

```java
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String s = br.readLine().trim();
    int k = Integer.parseInt(br.readLine().trim());
    final long BASE = 31L;
    final long MOD = 1_000_000_007L;
    int n = s.length();
    long pw = 1L;
    for (int i = 0; i < k - 1; i++) pw = pw * BASE % MOD;
    long h = 0L;
    for (int i = 0; i < k; i++) {
      h = (h * BASE + (s.charAt(i) - 'a' + 1)) % MOD;
    }
    StringBuilder sb = new StringBuilder();
    sb.append(h);
    for (int i = 1; i <= n - k; i++) {
      h = (h - (long)(s.charAt(i - 1) - 'a' + 1) * pw % MOD + MOD) % MOD;
      h = (h * BASE + (s.charAt(i + k - 1) - 'a' + 1)) % MOD;
      sb.append(' ').append(h);
    }
    System.out.print(sb);
  }
}
```

입력

```
abcde
3
```

출력

```
1026 2019 3012
```
