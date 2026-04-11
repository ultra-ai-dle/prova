# bst — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static int[] lc, rc, val;
  static int size = 0;
  static StringBuilder sb = new StringBuilder();

  static int insert(int root, int v) {
    if (root == -1) {
      val[size] = v; lc[size] = -1; rc[size] = -1;
      return size++;
    }
    if (v < val[root]) lc[root] = insert(lc[root], v);
    else if (v > val[root]) rc[root] = insert(rc[root], v);
    return root;
  }

  static int search(int root, int v) {
    if (root == -1) return 0;
    if (v == val[root]) return 1;
    return v < val[root] ? search(lc[root], v) : search(rc[root], v);
  }

  static boolean inFirst = true;
  static void inorder(int root) {
    if (root == -1) return;
    inorder(lc[root]);
    if (!inFirst) sb.append(' ');
    sb.append(val[root]);
    inFirst = false;
    inorder(rc[root]);
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine().trim());
    val = new int[q + 1]; lc = new int[q + 1]; rc = new int[q + 1];
    int root = -1;
    for (int i = 0; i < q; i++) {
      String[] parts = br.readLine().split(" ");
      if (parts[0].equals("insert")) {
        root = insert(root, Integer.parseInt(parts[1]));
      } else if (parts[0].equals("search")) {
        sb.append(search(root, Integer.parseInt(parts[1]))).append('\n');
      } else if (parts[0].equals("inorder")) {
        inFirst = true;
        inorder(root);
        sb.append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
6
insert 5
insert 3
insert 7
insert 1
search 3
inorder
```

출력

```
1
1 3 5 7
```
