# algorithms/sort/counting — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    StringTokenizer st = new StringTokenizer(br.readLine());

    int[] count = new int[101];
    for (int i = 0; i < n; i++) count[Integer.parseInt(st.nextToken())]++;

    StringBuilder sb = new StringBuilder();
    boolean first = true;
    for (int i = 0; i <= 100; i++) {
      for (int j = 0; j < count[i]; j++) {
        if (!first) sb.append(' ');
        sb.append(i);
        first = false;
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
7
4 2 2 8 3 3 1
```

출력

```
1 2 2 3 3 4 8
```
