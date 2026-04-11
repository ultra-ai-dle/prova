# 정수 집합 비트셋 — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();

    int n = Integer.parseInt(br.readLine().trim());
    java.util.BitSet bits = new java.util.BitSet(n);

    int q = Integer.parseInt(br.readLine().trim());
    for (int i = 0; i < q; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      String op = st.nextToken();
      if (op.equals("set")) {
        bits.set(Integer.parseInt(st.nextToken()));
      } else if (op.equals("clear")) {
        bits.clear(Integer.parseInt(st.nextToken()));
      } else if (op.equals("flip")) {
        bits.flip(Integer.parseInt(st.nextToken()));
      } else if (op.equals("get")) {
        sb.append(bits.get(Integer.parseInt(st.nextToken())) ? 1 : 0).append('\n');
      } else if (op.equals("count")) {
        sb.append(bits.cardinality()).append('\n');
      }
    }

    System.out.print(sb);
  }
}
```

입력

```
64
5
set 3
set 7
flip 3
get 3
count
```

출력

```
0
1
```
