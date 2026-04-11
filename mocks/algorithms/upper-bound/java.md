# upper-bound — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine().trim());
    int[] arr = Arrays.stream(br.readLine().trim().split(" "))
      .mapToInt(Integer::parseInt).toArray();
    int target = Integer.parseInt(br.readLine().trim());

    int lo = 0, hi = n;
    while (lo < hi) {
      int mid = (lo + hi) / 2;
      if (arr[mid] <= target) lo = mid + 1;
      else hi = mid;
    }

    StringBuilder sb = new StringBuilder();
    sb.append(lo).append('\n');
    System.out.print(sb);
  }
}
```

입력

```
7
1 2 4 4 5 7 9
4
```

출력

```
4
```
