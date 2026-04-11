# LIS — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    StringTokenizer st = new StringTokenizer(br.readLine());
    int[] arr = new int[n];
    for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());
    List<Integer> tails = new ArrayList<>();
    for (int x : arr) {
      int pos = Collections.binarySearch(tails, x);
      if (pos < 0) pos = -(pos + 1);
      if (pos == tails.size()) tails.add(x);
      else tails.set(pos, x);
    }
    StringBuilder sb = new StringBuilder();
    sb.append(tails.size());
    System.out.print(sb);
  }
}
```

입력

```
8
3 1 4 1 5 9 2 6
```

출력

```
4
```
