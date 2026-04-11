# 모듈러 역원 — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static long modPow(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
      if ((exp & 1) == 1) result = result * base % mod;
      exp >>= 1;
      base = base * base % mod;
    }
    return result;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    long a = Long.parseLong(st.nextToken());
    long m = Long.parseLong(st.nextToken());
    StringBuilder sb = new StringBuilder();
    sb.append(modPow(a, m - 2, m));
    System.out.print(sb);
  }
}
```

입력

```
3 7
```

출력

```
5
```
