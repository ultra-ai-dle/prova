# trie — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static class Node {
    Map<Character, Node> nxt = new HashMap<>();
    int cnt;
  }

  static void insert(Node r, String s) {
    r.cnt++;
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      r = r.nxt.computeIfAbsent(c, k -> new Node());
      r.cnt++;
    }
  }

  static int countPref(Node r, String s) {
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (!r.nxt.containsKey(c)) return 0;
      r = r.nxt.get(c);
    }
    return r.cnt;
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine());
    Node root = new Node();
    StringBuilder sb = new StringBuilder();
    for (int k = 0; k < q; k++) {
      String[] parts = br.readLine().split("\\s+");
      if (parts[0].equals("insert")) {
        insert(root, parts[1]);
      } else {
        sb.append(countPref(root, parts[1])).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
7
insert app
insert apple
insert appetite
count app
count ple
count apx
count z
```

출력

```
3
0
0
0
```
