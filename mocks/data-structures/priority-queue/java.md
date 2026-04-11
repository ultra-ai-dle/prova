# priority-queue — Java

`java.util.PriorityQueue` — 기본 **min-heap**

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    PriorityQueue<Integer> pq = new PriorityQueue<>();
    for (int i = 0; i < n; i++) {
      pq.offer(Integer.parseInt(tok[i]));
    }
    StringBuilder sb = new StringBuilder();
    while (!pq.isEmpty()) {
      if (sb.length() > 0) sb.append(' ');
      sb.append(pq.poll());
    }
    System.out.println(sb);
  }
}
```

입력

```
3
3 1 2
```

출력

```
1 2 3
```
