# fast-exponentiation — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static long power(long a, long b, long m) {
    long result = 1;
    a %= m;
    while (b > 0) {
      if ((b & 1) == 1) result = result * a % m;
      a = a * a % m;
      b >>= 1;
    }
    return result;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    long a = Long.parseLong(st.nextToken());
    long b = Long.parseLong(st.nextToken());
    long m = Long.parseLong(st.nextToken());
    StringBuilder sb = new StringBuilder();
    sb.append(power(a, b, m)).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
2 10 1000000007
```

출력

```
1024
```
