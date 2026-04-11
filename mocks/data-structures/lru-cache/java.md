# LRU Cache — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static int capacity;
  static LinkedHashMap<Integer, Integer> cache;

  static int get(int key) {
    if (!cache.containsKey(key)) return -1;
    int val = cache.remove(key);
    cache.put(key, val);
    return val;
  }

  static void put(int key, int value) {
    if (cache.containsKey(key)) cache.remove(key);
    cache.put(key, value);
    if (cache.size() > capacity) {
      cache.remove(cache.entrySet().iterator().next().getKey());
    }
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    capacity = Integer.parseInt(br.readLine().trim());
    int q = Integer.parseInt(br.readLine().trim());
    cache = new LinkedHashMap<>();
    for (int i = 0; i < q; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      String op = st.nextToken();
      if (op.equals("get")) {
        sb.append(get(Integer.parseInt(st.nextToken()))).append('\n');
      } else {
        put(Integer.parseInt(st.nextToken()), Integer.parseInt(st.nextToken()));
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
2
5
put 1 1
put 2 2
get 1
put 3 3
get 2
```

출력

```
1
-1
```
