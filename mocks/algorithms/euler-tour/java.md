# algorithms/euler-tour — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static List<Integer>[] adj;
  static int[] tin, tout;
  static int timer = 0;

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    adj = new List[n];
    for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
    for (int i = 0; i < n - 1; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      adj[u].add(v);
      adj[v].add(u);
    }
    tin = new int[n];
    tout = new int[n];
    Deque<int[]> stack = new ArrayDeque<>();
    stack.push(new int[]{0, -1, 0});
    while (!stack.isEmpty()) {
      int[] cur = stack.pop();
      int u = cur[0], parent = cur[1], leaving = cur[2];
      if (leaving == 1) {
        tout[u] = timer++;
      } else {
        tin[u] = timer++;
        stack.push(new int[]{u, parent, 1});
        List<Integer> children = adj[u];
        for (int i = children.size() - 1; i >= 0; i--) {
          int v = children.get(i);
          if (v != parent) stack.push(new int[]{v, u, 0});
        }
      }
    }
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) {
      sb.append(tin[i]).append(' ').append(tout[i]).append('\n');
    }
    System.out.print(sb);
  }
}
```

입력

```
5
0 1
0 2
1 3
1 4
```

출력

```
0 9
1 6
7 8
2 3
4 5
```
