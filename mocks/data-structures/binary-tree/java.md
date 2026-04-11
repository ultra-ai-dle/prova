# binary-tree — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static int[] left, right, val;
  static StringBuilder sb = new StringBuilder();

  static void preorder(int i) {
    if (i == -1) return;
    sb.append(val[i]).append(' ');
    preorder(left[i]);
    preorder(right[i]);
  }
  static void inorder(int i) {
    if (i == -1) return;
    inorder(left[i]);
    sb.append(val[i]).append(' ');
    inorder(right[i]);
  }
  static void postorder(int i) {
    if (i == -1) return;
    postorder(left[i]);
    postorder(right[i]);
    sb.append(val[i]).append(' ');
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    StringTokenizer st = new StringTokenizer(br.readLine());
    val = new int[n]; left = new int[n]; right = new int[n];
    Arrays.fill(left, -1); Arrays.fill(right, -1);
    int[] nodes = new int[n];
    for (int i = 0; i < n; i++) {
      int v = Integer.parseInt(st.nextToken());
      nodes[i] = (v == -1) ? -1 : v;
      val[i] = v;
    }
    for (int i = 0; i < n; i++) {
      if (nodes[i] == -1) continue;
      int l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && nodes[l] != -1) left[i] = l;
      if (r < n && nodes[r] != -1) right[i] = r;
    }
    preorder(0); sb.append('\n');
    inorder(0); sb.append('\n');
    postorder(0); sb.append('\n');
    System.out.print(sb.toString().stripTrailing().replace(" \n", "\n"));
  }
}
```

입력

```
7
1 2 3 4 5 6 7
```

출력

```
1 2 4 5 3 6 7
4 2 5 1 6 3 7
4 5 2 6 7 3 1
```
