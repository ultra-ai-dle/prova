# Dynamic Array — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine().trim());
    ArrayList<Integer> arr = new ArrayList<>();
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < q; i++) {
      String[] parts = br.readLine().split(" ");
      if (parts[0].equals("push")) {
        arr.add(Integer.parseInt(parts[1]));
      } else if (parts[0].equals("pop")) {
        sb.append(arr.remove(arr.size() - 1)).append('\n');
      } else if (parts[0].equals("get")) {
        sb.append(arr.get(Integer.parseInt(parts[1]))).append('\n');
      } else if (parts[0].equals("size")) {
        sb.append(arr.size()).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
6
push 10
push 20
push 30
pop
size
get 0
```

출력

```
30
2
10
```
