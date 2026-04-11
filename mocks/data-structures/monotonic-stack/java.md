# monotonic-stack — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    int n = Integer.parseInt(br.readLine().trim());
    StringTokenizer st = new StringTokenizer(br.readLine());
    int[] arr = new int[n];
    for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < n; i++) {
      while (!stack.isEmpty() && arr[stack.peek()] < arr[i]) {
        result[stack.pop()] = i;
      }
      stack.push(i);
    }
    for (int i = 0; i < n; i++) {
      if (i > 0) sb.append(' ');
      sb.append(result[i]);
    }
    System.out.print(sb);
  }
}
```

입력

```
6
2 1 5 6 2 3
```

출력

```
2 2 3 -1 5 -1
```
