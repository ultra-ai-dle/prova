# Doubly Linked List — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static int[] val = new int[100005];
  static int[] prev = new int[100005];
  static int[] next = new int[100005];
  static int head = -1, tail = -1, size = 0;

  static void pushBack(int v) {
    val[size] = v;
    prev[size] = tail;
    next[size] = -1;
    if (tail != -1) next[tail] = size;
    else head = size;
    tail = size++;
  }

  static void pushFront(int v) {
    val[size] = v;
    next[size] = head;
    prev[size] = -1;
    if (head != -1) prev[head] = size;
    else tail = size;
    head = size++;
  }

  static void popBack() {
    if (tail == -1) return;
    int t = tail;
    tail = prev[t];
    if (tail != -1) next[tail] = -1;
    else head = -1;
  }

  static void popFront() {
    if (head == -1) return;
    int h = head;
    head = next[h];
    if (head != -1) prev[head] = -1;
    else tail = -1;
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    int n = Integer.parseInt(br.readLine().trim());
    for (int i = 0; i < n; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      String op = st.nextToken();
      if (op.equals("push_back")) pushBack(Integer.parseInt(st.nextToken()));
      else if (op.equals("push_front")) pushFront(Integer.parseInt(st.nextToken()));
      else if (op.equals("pop_back")) popBack();
      else if (op.equals("pop_front")) popFront();
      else {
        StringBuilder line = new StringBuilder();
        int cur = head;
        while (cur != -1) {
          if (line.length() > 0) line.append(' ');
          line.append(val[cur]);
          cur = next[cur];
        }
        sb.append(line).append('\n');
      }
    }
    System.out.print(sb);
  }
}
```

입력

```
6
push_back 1
push_back 2
push_front 0
pop_front
push_back 3
print
```

출력

```
1 2 3
```
