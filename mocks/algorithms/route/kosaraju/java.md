# Kosaraju — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int m = Integer.parseInt(st.nextToken());

    List<Integer>[] graph = new ArrayList[n];
    List<Integer>[] rev = new ArrayList[n];
    for (int i = 0; i < n; i++) {
      graph[i] = new ArrayList<>();
      rev[i] = new ArrayList<>();
    }
    for (int i = 0; i < m; i++) {
      st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      graph[u].add(v);
      rev[v].add(u);
    }

    boolean[] visited = new boolean[n];
    Deque<Integer> order = new ArrayDeque<>();

    for (int i = 0; i < n; i++) {
      if (!visited[i]) {
        Deque<int[]> stack = new ArrayDeque<>();
        stack.push(new int[]{i, 0});
        while (!stack.isEmpty()) {
          int[] top = stack.pop();
          int node = top[0], phase = top[1];
          if (phase == 0) {
            if (visited[node]) continue;
            visited[node] = true;
            stack.push(new int[]{node, 1});
            for (int nb : graph[node]) {
              if (!visited[nb]) stack.push(new int[]{nb, 0});
            }
          } else {
            order.push(node);
          }
        }
      }
    }

    boolean[] visited2 = new boolean[n];
    int sccCount = 0;

    for (int start : order) {
      if (!visited2[start]) {
        visited2[start] = true;
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(start);
        while (!stack.isEmpty()) {
          int node = stack.pop();
          for (int nb : rev[node]) {
            if (!visited2[nb]) {
              visited2[nb] = true;
              stack.push(nb);
            }
          }
        }
        sccCount++;
      }
    }

    StringBuilder sb = new StringBuilder();
    sb.append(sccCount).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
5 6
0 1
1 2
2 0
1 3
3 4
4 3
```

출력

```
3
```
