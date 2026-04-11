# deque — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine());
    Deque<Integer> d = new ArrayDeque<>();
    StringBuilder sb = new StringBuilder();
    for (int k = 0; k < q; k++) {
      String[] parts = br.readLine().split("\\s+");
      String op = parts[0];
      if (op.equals("push_front")) {
        d.addFirst(Integer.parseInt(parts[1]));
      } else if (op.equals("push_back")) {
        d.addLast(Integer.parseInt(parts[1]));
      } else if (op.equals("pop_front")) {
        sb.append(d.removeFirst()).append('\n');
      } else {
        sb.append(d.removeLast()).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
6
push_back 1
push_back 2
push_front 0
pop_front
pop_back
pop_front
```

출력

```
0
2
1
```
