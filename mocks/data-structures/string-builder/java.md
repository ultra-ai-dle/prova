# String Builder — Java
`Main.java`

```java
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int q = Integer.parseInt(br.readLine().trim());
    StringBuilder sb = new StringBuilder();
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < q; i++) {
      String line = br.readLine();
      int spaceIdx = line.indexOf(' ');
      String cmd = spaceIdx == -1 ? line : line.substring(0, spaceIdx);
      String arg = spaceIdx == -1 ? "" : line.substring(spaceIdx + 1);
      if (cmd.equals("append")) {
        sb.append(arg);
      } else if (cmd.equals("prepend")) {
        sb.insert(0, arg);
      } else if (cmd.equals("build")) {
        out.append(sb).append('\n');
      }
    }
    System.out.print(out);
  }
}
```

입력

```
4
append hello
append  world
prepend say 
build
```

출력

```
say hello world
```
