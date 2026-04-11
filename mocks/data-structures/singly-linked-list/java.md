# singly-linked-list — Java

`Main.java`

```java
import java.io.*;

public class Main {
  static class Node {
    int v;
    Node nxt;
    Node(int v) {
      this.v = v;
    }
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    Node head = null;
    for (int i = n - 1; i >= 0; i--) {
      Node nd = new Node(Integer.parseInt(tok[i]));
      nd.nxt = head;
      head = nd;
    }
    Node prev = null, cur = head;
    while (cur != null) {
      Node nxt = cur.nxt;
      cur.nxt = prev;
      prev = cur;
      cur = nxt;
    }
    StringBuilder sb = new StringBuilder();
    cur = prev;
    while (cur != null) {
      if (sb.length() > 0) sb.append(' ');
      sb.append(cur.v);
      cur = cur.nxt;
    }
    System.out.println(sb);
  }
}
```

입력

```
5
1 2 3 4 5
```

출력

```
5 4 3 2 1
```
