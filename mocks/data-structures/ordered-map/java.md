# Ordered Map — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine().trim());
    TreeMap<Integer, Integer> map = new TreeMap<>();
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < q; i++) {
      String[] parts = br.readLine().split(" ");
      if (parts[0].equals("put")) {
        map.put(Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
      } else if (parts[0].equals("get")) {
        sb.append(map.get(Integer.parseInt(parts[1]))).append('\n');
      } else if (parts[0].equals("remove")) {
        map.remove(Integer.parseInt(parts[1]));
      } else if (parts[0].equals("min")) {
        sb.append(map.firstKey()).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
5
put 3 30
put 1 10
put 2 20
min
get 2
```

출력

```
1
20
```
