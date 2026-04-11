# 확장 유클리드 알고리즘 — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static long[] extendedGcd(long a, long b) {
    if (b == 0) return new long[]{a, 1, 0};
    long[] r = extendedGcd(b, a % b);
    return new long[]{r[0], r[2], r[1] - (a / b) * r[2]};
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    long a = Long.parseLong(st.nextToken());
    long b = Long.parseLong(st.nextToken());
    long[] res = extendedGcd(a, b);
    StringBuilder sb = new StringBuilder();
    sb.append(res[0]).append(' ').append(res[1]).append(' ').append(res[2]);
    System.out.print(sb);
  }
}
```

입력

```
35 15
```

출력

```
5 1 -2
```
