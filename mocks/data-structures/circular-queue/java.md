# Circular Queue — Java
`Main.java`

```java
import java.util.*;
import java.io.*;

public class Main {
  static int[] queue;
  static int front = 0, rear = 0, k;

  static boolean isFull() { return (rear + 1) % (k + 1) == front; }
  static boolean isEmpty() { return front == rear; }

  static void enqueue(StringBuilder sb, int v) {
    if (isFull()) { sb.append("FULL\n"); return; }
    queue[rear] = v;
    rear = (rear + 1) % (k + 1);
  }

  static void dequeue(StringBuilder sb) {
    if (isEmpty()) { sb.append("EMPTY\n"); return; }
    sb.append(queue[front]).append('\n');
    front = (front + 1) % (k + 1);
  }

  static void front(StringBuilder sb) {
    if (isEmpty()) sb.append("EMPTY\n");
    else sb.append(queue[front]).append('\n');
  }

  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    k = Integer.parseInt(br.readLine().trim());
    int q = Integer.parseInt(br.readLine().trim());
    queue = new int[k + 1];
    for (int i = 0; i < q; i++) {
      StringTokenizer st = new StringTokenizer(br.readLine());
      String op = st.nextToken();
      if (op.equals("enqueue")) enqueue(sb, Integer.parseInt(st.nextToken()));
      else if (op.equals("dequeue")) dequeue(sb);
      else if (op.equals("front")) front(sb);
      else if (op.equals("isEmpty")) sb.append(isEmpty() ? 1 : 0).append('\n');
    }
    System.out.print(sb);
  }
}
```

입력

```
3
7
enqueue 1
enqueue 2
enqueue 3
enqueue 4
dequeue
front
isEmpty
```

출력

```
FULL
1
2
0
```
