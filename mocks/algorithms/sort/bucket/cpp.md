# bucket-sort — C++

```cpp
#include <iostream>
#include <vector>
using namespace std;

void insertionSort(vector<int>& b) {
  for (int i = 1; i < (int)b.size(); i++) {
    int key = b[i];
    int j = i - 1;
    while (j >= 0 && b[j] > key) {
      b[j + 1] = b[j];
      j--;
    }
    b[j + 1] = key;
  }
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  const int k = 10;
  vector<vector<int>> buckets(k);
  for (int i = 0; i < n; i++) {
    int v;
    cin >> v;
    buckets[v * k / 1000].push_back(v);
  }
  bool first = true;
  for (auto& b : buckets) {
    insertionSort(b);
    for (int v : b) {
      if (!first) cout << ' ';
      cout << v;
      first = false;
    }
  }
  cout << '\n';
}
```

입력

```
7
64 25 12 22 11 90 45
```

출력

```
11 12 22 25 45 64 90
```
