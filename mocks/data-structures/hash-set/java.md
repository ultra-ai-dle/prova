# Hash Set — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine().trim());
    HashSet<Integer> s = new HashSet<>();
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < q; i++) {
      String[] parts = br.readLine().split(" ");
      if (parts[0].equals("add")) {
        s.add(Integer.parseInt(parts[1]));
      } else if (parts[0].equals("remove")) {
        s.remove(Integer.parseInt(parts[1]));
      } else if (parts[0].equals("contains")) {
        sb.append(s.contains(Integer.parseInt(parts[1])) ? 1 : 0).append('\n');
      } else if (parts[0].equals("size")) {
        sb.append(s.size()).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
6
add 5
add 3
add 5
contains 5
remove 5
contains 5
```

출력

```
1
0
```
