# mocks 문서 가이드

## 트리 규칙

- **DS**: `mocks/data-structures/<topic>/`
- **Algo**: 그래프·경로·트리 등 **루트 계열**은 `mocks/algorithms/route/<topic>/` — 정렬은 `mocks/algorithms/sort/<name>/` — 그 외(이진 탐색, DP 패턴 등)는 `mocks/algorithms/<topic>/` 또는 `mocks/algorithms/dp/<name>/`
- **union-find**: DS만 (`data-structures/union-find/`). 알고리즘 쪽 별도 폴더 없음 (Kruskal 등에서 맥락).
- **heap / heap-queue**: `priority-queue` 폴더 하나. 문서에서 언어별 이름(`heapq`, `PriorityQueue` 등) 명시.

## 파일명

각 주제 폴더에 네 개: `python.md`, `javascript.md`, `java.md`, `cpp.md`

## 코드 스타일

- **들여쓰기**: 탭 금지, **스페이스 2칸** (Python·JS·Java·C++ 공통).
- **입출력**: 예시는 반드시 **표준 입력(stdin) / 표준 출력(stdout)** 을 쓴다.
  - **Python**: `import sys` 후 `input = sys.stdin.readline` 패턴 권장. 출력은 `print` 또는 `sys.stdout.write`.
  - **JavaScript (Node)**: `const fs = require('fs');` 로 `fs.readFileSync(0, 'utf8')` 등 **표준 입력( fd 0 )** 읽기. 출력은 `console.log` (마지막 개행 주의).
  - **Java**: `Scanner(System.in)` 또는 `BufferedReader` + `System.out`.
  - **C++**: `cin` / `cout` (필요 시 `ios::sync_with_stdio(false); cin.tie(nullptr);`).

## 본문 형식 (각 `*.md`)

1. `# <주제> — <Language>` 제목
2. **코드** 블록: 위 입출력 규칙을 만족하는 완결 프로그램
3. **입력**: 자연어로 그래프를 설명하지 않는다. **아래 고정 형식**만 둔다.
   - 제목 `입력` 다음에 **빈 줄**, 그다음 **펜스된 코드 블록**에 **실제로 stdin에 넣을 바이트**를 그대로 적는다 (예제 값).
4. **출력**: 마찬가지로 **펜스된 코드 블록**에 stdout 한 덩어리.

입·출력 블록 예:

````
입력

```
1
1 2 3
4 5 6
```

출력

```
ok
```
````

토큰·유지보수: 예시는 1케이스. 주석은 최소.

## 진행

전체 계획 목록과 상태는 [PROGRESS.md](PROGRESS.md)만 갱신. 새 주제 추가 시 [INDEX.md](INDEX.md) 링크 추가.
