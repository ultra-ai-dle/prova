# queue — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine());
    Queue<Integer> dq = new ArrayDeque<>();
    StringBuilder sb = new StringBuilder();
    for (int k = 0; k < q; k++) {
      String[] parts = br.readLine().split("\\s+");
      if (parts[0].equals("push")) {
        dq.offer(Integer.parseInt(parts[1]));
      } else {
        sb.append(dq.poll()).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
5
push 1
push 2
pop
push 3
pop
```

출력

```
1
2
```
