# 구간 합 세그먼트 트리 — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int[] arr, tree;
  static int n;

  static void build(int node, int start, int end) {
    if (start == end) {
      tree[node] = arr[start];
    } else {
      int mid = (start + end) / 2;
      build(2*node, start, mid);
      build(2*node+1, mid+1, end);
      tree[node] = tree[2*node] + tree[2*node+1];
    }
  }

  static void update(int node, int start, int end, int i, int val) {
    if (start == end) {
      arr[i] = val;
      tree[node] = val;
    } else {
      int mid = (start + end) / 2;
      if (i <= mid) update(2*node, start, mid, i, val);
      else update(2*node+1, mid+1, end, i, val);
      tree[node] = tree[2*node] + tree[2*node+1];
    }
  }

  static int query(int node, int start, int end, int l, int r) {
    if (r < start || end < l) return 0;
    if (l <= start && end <= r) return tree[node];
    int mid = (start + end) / 2;
    return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r);
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();

    n = Integer.parseInt(br.readLine().trim());
    StringTokenizer st = new StringTokenizer(br.readLine());
    arr = new int[n];
    for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());

    tree = new int[4 * n];
    build(1, 0, n-1);

    int q = Integer.parseInt(br.readLine().trim());
    for (int i = 0; i < q; i++) {
      st = new StringTokenizer(br.readLine());
      String op = st.nextToken();
      if (op.equals("update")) {
        update(1, 0, n-1, Integer.parseInt(st.nextToken()), Integer.parseInt(st.nextToken()));
      } else {
        sb.append(query(1, 0, n-1, Integer.parseInt(st.nextToken()), Integer.parseInt(st.nextToken()))).append('\n');
      }
    }

    System.out.print(sb);
  }
}
```

입력

```
5
1 2 3 4 5
3
update 1 10
query 0 3
query 2 4
```

출력

```
17
12
```
