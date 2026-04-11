# hash-table — Java

`HashMap<String, Integer>`

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine());
    Map<String, Integer> d = new HashMap<>();
    StringBuilder sb = new StringBuilder();
    for (int k = 0; k < q; k++) {
      String[] parts = br.readLine().split("\\s+");
      if (parts[0].equals("set")) {
        d.put(parts[1], Integer.parseInt(parts[2]));
      } else {
        sb.append(d.getOrDefault(parts[1], 0)).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
6
set a 10
get a
set b 20
get b
set a 30
get a
```

출력

```
10
20
30
```
