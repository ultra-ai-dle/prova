# stack — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine());
    Deque<Integer> s = new ArrayDeque<>();
    StringBuilder sb = new StringBuilder();
    for (int k = 0; k < q; k++) {
      String[] parts = br.readLine().split("\\s+");
      if (parts[0].equals("push")) {
        s.push(Integer.parseInt(parts[1]));
      } else {
        sb.append(s.pop()).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
6
push 1
push 2
pop
push 3
pop
pop
```

출력

```
2
3
1
```
