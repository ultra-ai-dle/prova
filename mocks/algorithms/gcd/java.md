# gcd — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static long gcd(long a, long b) {
    while (b != 0) { long t = b; b = a % b; a = t; }
    return a;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    long a = Long.parseLong(st.nextToken());
    long b = Long.parseLong(st.nextToken());
    long g = gcd(a, b);
    long lcm = a / g * b;
    StringBuilder sb = new StringBuilder();
    sb.append(g).append(' ').append(lcm).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
48 18
```

출력

```
6 144
```
