# Z Algorithm — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int[] zFunction(String s) {
    int n = s.length();
    int[] z = new int[n];
    z[0] = n;
    int l = 0, r = 0;
    for (int i = 1; i < n; i++) {
      if (i < r) z[i] = Math.min(r - i, z[i - l]);
      while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
      if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String t = br.readLine().trim();
    String p = br.readLine().trim();
    String s = p + "$" + t;
    int[] z = zFunction(s);
    int m = p.length();
    List<Integer> result = new ArrayList<>();
    for (int i = m + 1; i < s.length(); i++) {
      if (z[i] == m) result.add(i - m - 1);
    }
    StringBuilder sb = new StringBuilder();
    if (result.isEmpty()) {
      sb.append(-1);
    } else {
      for (int i = 0; i < result.size(); i++) {
        if (i > 0) sb.append(' ');
        sb.append(result.get(i));
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
aabxaaabxaaabxaab
aab
```

출력

```
0 5 9 14
```
