# algorithms/range-query — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int[] tree;
  static int n;

  static void build(int[] arr, int node, int start, int end) {
    if (start == end) {
      tree[node] = arr[start];
      return;
    }
    int mid = (start + end) / 2;
    build(arr, 2 * node, start, mid);
    build(arr, 2 * node + 1, mid + 1, end);
    tree[node] = Math.min(tree[2 * node], tree[2 * node + 1]);
  }

  static int query(int node, int start, int end, int l, int r) {
    if (r < start || end < l) return Integer.MAX_VALUE;
    if (l <= start && end <= r) return tree[node];
    int mid = (start + end) / 2;
    return Math.min(query(2 * node, start, mid, l, r),
                    query(2 * node + 1, mid + 1, end, l, r));
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    n = Integer.parseInt(br.readLine().trim());
    StringTokenizer st = new StringTokenizer(br.readLine());
    int[] arr = new int[n];
    for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());
    tree = new int[4 * n];
    build(arr, 1, 0, n - 1);
    int q = Integer.parseInt(br.readLine().trim());
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < q; i++) {
      st = new StringTokenizer(br.readLine());
      int l = Integer.parseInt(st.nextToken());
      int r = Integer.parseInt(st.nextToken());
      sb.append(query(1, 0, n - 1, l, r)).append('\n');
    }
    System.out.print(sb);
  }
}
```

입력

```
8
2 4 3 1 6 7 8 5
3
1 5
0 7
3 6
```

출력

```
1
1
1
```
