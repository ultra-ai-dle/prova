# trie — Python

각 노드에 **해당 접두사를 지나는 삽입 문자열 수** `cnt` 저장.

```python
import sys

input = sys.stdin.readline

class TrieNode:
  __slots__ = ('nxt', 'cnt')
  def __init__(self):
    self.nxt = {}
    self.cnt = 0

def insert(r, s):
  r.cnt += 1
  for c in s:
    if c not in r.nxt:
      r.nxt[c] = TrieNode()
    r = r.nxt[c]
    r.cnt += 1

def count_pref(r, s):
  for c in s:
    if c not in r.nxt:
      return 0
    r = r.nxt[c]
  return r.cnt

def main():
  q = int(input())
  root = TrieNode()
  out = []
  for _ in range(q):
    parts = input().split()
    if parts[0] == "insert":
      insert(root, parts[1])
    else:
      out.append(str(count_pref(root, parts[1])))
  sys.stdout.write("\n".join(out))

if __name__ == "__main__":
  main()
```

입력

```
7
insert app
insert apple
insert appetite
count app
count ple
count apx
count z
```

출력

```
3
0
0
0
```
