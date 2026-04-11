# KMP — Java

`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  static int[] buildFailure(String p) {
    int m = p.length();
    int[] fail = new int[m];
    int j = 0;
    for (int i = 1; i < m; i++) {
      while (j > 0 && p.charAt(i) != p.charAt(j)) j = fail[j - 1];
      if (p.charAt(i) == p.charAt(j)) j++;
      fail[i] = j;
    }
    return fail;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String t = br.readLine().trim();
    String p = br.readLine().trim();
    int[] fail = buildFailure(p);
    List<Integer> result = new ArrayList<>();
    int j = 0;
    for (int i = 0; i < t.length(); i++) {
      while (j > 0 && t.charAt(i) != p.charAt(j)) j = fail[j - 1];
      if (t.charAt(i) == p.charAt(j)) j++;
      if (j == p.length()) {
        result.add(i - p.length() + 1);
        j = fail[j - 1];
      }
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
AABAACAADAABAABA
AABA
```

출력

```
0 9 12
```
