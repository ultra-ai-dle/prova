# bucket-sort — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static void insertionSort(List<Integer> b) {
    for (int i = 1; i < b.size(); i++) {
      int key = b.get(i);
      int j = i - 1;
      while (j >= 0 && b.get(j) > key) {
        b.set(j + 1, b.get(j));
        j--;
      }
      b.set(j + 1, key);
    }
  }

  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int k = 10;
    List<List<Integer>> buckets = new ArrayList<>();
    for (int i = 0; i < k; i++) buckets.add(new ArrayList<>());
    for (int i = 0; i < n; i++) {
      int v = Integer.parseInt(tok[i]);
      buckets.get(v * k / 1000).add(v);
    }
    StringBuilder sb = new StringBuilder();
    boolean first = true;
    for (List<Integer> b : buckets) {
      insertionSort(b);
      for (int v : b) {
        if (!first) sb.append(' ');
        sb.append(v);
        first = false;
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
7
64 25 12 22 11 90 45
```

출력

```
11 12 22 25 45 64 90
```
