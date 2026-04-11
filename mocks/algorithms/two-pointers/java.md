# two-pointers — Java

`Main.java`

```java
import java.io.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    String[] tok = br.readLine().split("\\s+");
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(tok[i]);
    int t = Integer.parseInt(br.readLine());
    int i = 0, j = n - 1;
    while (i < j) {
      int s = a[i] + a[j];
      if (s == t) {
        System.out.println(a[i] + " " + a[j]);
        return;
      }
      if (s < t) i++;
      else j--;
    }
    System.out.println(-1);
  }
}
```

입력

```
6
1 2 4 5 7 11
13
```

출력

```
2 11
```
