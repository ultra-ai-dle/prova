# monotonic-queue — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int k = Integer.parseInt(st.nextToken());
    int[] arr = new int[n];
    st = new StringTokenizer(br.readLine());
    for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());
    Deque<Integer> dq = new ArrayDeque<>();
    boolean first = true;
    for (int i = 0; i < n; i++) {
      while (!dq.isEmpty() && dq.peekFirst() < i - k + 1) dq.pollFirst();
      while (!dq.isEmpty() && arr[dq.peekLast()] < arr[i]) dq.pollLast();
      dq.offerLast(i);
      if (i >= k - 1) {
        if (!first) sb.append(' ');
        sb.append(arr[dq.peekFirst()]);
        first = false;
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
8 3
1 3 -1 -3 5 3 6 7
```

출력

```
3 3 5 5 6 7
```
