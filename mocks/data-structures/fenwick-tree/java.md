# 펜윅 트리 — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int n;
  static int[] tree;

  static void update(int i, int val) {
    for (; i <= n; i += i & (-i)) tree[i] += val;
  }

  static int prefixSum(int i) {
    int s = 0;
    for (; i > 0; i -= i & (-i)) s += tree[i];
    return s;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();

    n = Integer.parseInt(br.readLine().trim());
    tree = new int[n + 1];

    int q = Integer.parseInt(br.readLine().trim());
    for (int i = 0; i < q; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      String op = st.nextToken();
      if (op.equals("update")) {
        update(Integer.parseInt(st.nextToken()), Integer.parseInt(st.nextToken()));
      } else {
        sb.append(prefixSum(Integer.parseInt(st.nextToken()))).append('\n');
      }
    }

    System.out.print(sb);
  }
}
```

입력

```
6
3
update 2 5
update 4 3
query 5
```

출력

```
8
```
