# Articulation Points — Java
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
    for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
    for (int i = 0; i < m; i++) {
      st = new StringTokenizer(br.readLine());
      int u = Integer.parseInt(st.nextToken());
      int v = Integer.parseInt(st.nextToken());
      graph[u].add(v);
      graph[v].add(u);
    }

    int[] disc = new int[n], low = new int[n];
    boolean[] isAP = new boolean[n];
    Arrays.fill(disc, -1);
    int[] timer = {0};

    for (int start = 0; start < n; start++) {
      if (disc[start] != -1) continue;
      disc[start] = low[start] = timer[0]++;
      Deque<int[]> stack = new ArrayDeque<>();
      stack.push(new int[]{start, -1, 0});

      while (!stack.isEmpty()) {
        int[] top = stack.peek();
        int node = top[0], par = top[1], i = top[2];
        if (i < graph[node].size()) {
          top[2]++;
          int nb = graph[node].get(i);
          if (nb == par) continue;
          if (disc[nb] == -1) {
            disc[nb] = low[nb] = timer[0]++;
            stack.push(new int[]{nb, node, 0});
          } else {
            low[node] = Math.min(low[node], disc[nb]);
          }
        } else {
          stack.pop();
          if (!stack.isEmpty()) {
            int[] ptop = stack.peek();
            int p = ptop[0], pp = ptop[1];
            low[p] = Math.min(low[p], low[node]);
            if (pp == -1) {
              long rootChildren = graph[p].stream().filter(nb -> disc[nb] > disc[p]).count();
              if (rootChildren >= 2) isAP[p] = true;
            } else if (low[node] >= disc[p]) {
              isAP[p] = true;
            }
          }
        }
      }
    }

    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) if (isAP[i]) sb.append(i).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
5 5
0 1
1 2
2 0
1 3
3 4
```

출력

```
1
3
```
