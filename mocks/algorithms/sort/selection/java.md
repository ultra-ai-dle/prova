# algorithms/sort/selection — Java
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

    for (int i = 0; i < n; i++) {
      int minIdx = i;
      for (int j = i + 1; j < n; j++) {
        if (arr[j] < arr[minIdx]) minIdx = j;
      }
      int tmp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = tmp;
    }

    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < n; i++) {
      if (i > 0) sb.append(' ');
      sb.append(arr[i]);
    }
    System.out.print(sb);
  }
}
```

입력

```
6
5 3 8 1 4 2
```

출력

```
1 2 3 4 5 8
```
