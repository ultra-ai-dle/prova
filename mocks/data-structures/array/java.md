# Array — Java
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
    int q = Integer.parseInt(br.readLine().trim());
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < q; i++) {
      String[] parts = br.readLine().split(" ");
      if (parts[0].equals("get")) {
        sb.append(arr[Integer.parseInt(parts[1])]).append('\n');
      } else if (parts[0].equals("set")) {
        arr[Integer.parseInt(parts[1])] = Integer.parseInt(parts[2]);
      } else if (parts[0].equals("print")) {
        StringBuilder row = new StringBuilder();
        for (int j = 0; j < n; j++) {
          if (j > 0) row.append(' ');
          row.append(arr[j]);
        }
        sb.append(row).append('\n');
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
4
get 2
set 2 99
get 2
print
```

출력

```
3
99
1 2 99 4 5
```
