# LRU Cache — C++
`Main.cpp`

```cpp
#include <bits/stdc++.h>
using namespace std;

int capacity;
list<pair<int,int>> lst;
unordered_map<int, list<pair<int,int>>::iterator> mp;

int get(int key) {
  if (!mp.count(key)) return -1;
  auto it = mp[key];
  int val = it->second;
  lst.erase(it);
  lst.push_back({key, val});
  mp[key] = prev(lst.end());
  return val;
}

void put(int key, int value) {
  if (mp.count(key)) lst.erase(mp[key]);
  lst.push_back({key, value});
  mp[key] = prev(lst.end());
  if ((int)lst.size() > capacity) {
    mp.erase(lst.front().first);
    lst.pop_front();
  }
}

int main() {
  ios::sync_with_stdio(false); cin.tie(nullptr);
  cin >> capacity;
  int q; cin >> q;
  string op;
  while (q--) {
    cin >> op;
    if (op == "get") {
      int k; cin >> k;
      cout << get(k) << '\n';
    } else {
      int k, v; cin >> k >> v;
      put(k, v);
    }
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
