# /api/analyze — AI 알고리즘 분류 규칙

## Status

- [x] 구현
- [ ] 테스트
- [x] 문서화

## Domain Context

- 코드 + varTypes를 받아 알고리즘 분류(strategy) + 변수 매핑(var_mapping)을 결정하는 AI Phase 1
- 상세 아키텍처: [docs/features/ai-pipeline.md](../../../docs/features/ai-pipeline.md)

## 최우선 원칙: 타입도 이름도 초기화도 역할을 결정하지 않는다

**역할(role)은 오직 코드에서의 사용 패턴(usage)으로만 결정한다.** AI가 코드 전체를 읽고 판단한 역할을 전적으로 신뢰한다.

### 타입 기반 단언 금지

같은 타입이라도 사용 패턴에 따라 strategy가 달라진다.

| 같은 타입 | 사용 패턴                                 | strategy |
| --------- | ----------------------------------------- | -------- |
| 2D 배열   | `board[y][x]`에 타일 담고 방향벡터로 이동 | GRID     |
| 2D 배열   | `graph[u]`에 인접 노드 담음               | GRAPH    |
| 2D 배열   | `dp[i][j]`에 부분문제 최적값 담음         | GRID     |

이 규칙은 Python, JavaScript, Java 등 **모든 언어에 동일하게 적용**된다.

### 이름 기반 단언 금지

변수명은 역할을 결정하는 근거가 되지 않는다.

- 이름이 `stack`이어도 AI가 queue로 판단했으면 → queue
- 이름이 `graph`여도 AI가 GRID로 판단했으면 → GRID
- 이름이 `pivot`이어도 AI가 index로 판단했으면 → `pivot_mode: "index"`
- 이름이 `visited`, `seen`이어도 AI가 DP 테이블로 판단했으면 → DP

### 초기화 패턴 기반 단언 금지

초기화 코드는 역할을 결정하는 근거가 되지 않는다.

```python
# 아래 4가지 초기화 방식은 모두 같은 형태지만 역할이 완전히 다를 수 있다.
asdf = [False] * n        # VISITED일 수도, DP 플래그일 수도, 다른 무언가일 수도
asdf = [0] * n
asdf = [0x0] * n
asdf = ['F' for _ in range(n)]
```

```java
boolean[] asdf = new boolean[n];  // boolean 타입이라도 VISITED가 아닐 수 있다
int[] asdf = new int[n];          // int[]라도 DISTANCE가 아닐 수 있다
```

역할을 결정하는 것은 **해당 변수가 알고리즘 안에서 어떤 맥락으로 쓰이는지**다. 그 맥락 판단은 AI에게 전적으로 맡긴다.

### enricher(클라이언트 후처리)의 허용 범위

enricher가 판단할 수 있는 유일한 케이스는 **자료구조 연산 조합 자체가 역할을 직접 규정하는 경우**뿐이다.

```
// ✅ 허용 — 연산 조합이 역할을 직접 규정
push + pop (LIFO)              → STACK
push + shift (FIFO)            → QUEUE
addFirst + addLast (양방향)    → DEQUE
heapq.heappush(v, ...)         → HEAP
parent[x] = parent[parent[x]] → UNIONFIND (경로 압축 구조 자체)

// ❌ 금지 — 초기화·타입·이름으로 역할 결정
[False]*n + [i]=True           → VISITED  ← 금지
[INF]*n                        → DISTANCE ← 금지
boolean[] 선언                 → VISITED  ← 금지
int[] + Arrays.fill(...)       → DISTANCE ← 금지
변수명 visited, dist, seen     → 역할 단언 ← 금지
```

### 프롬프트 작성 기준

```
// ❌ 타입 기반 단언 — 금지
"list (2D)는 GRID로 분류"
"int[][]는 list2d로 분류"

// ❌ 이름 기반 단언 — 금지
"int left=0, right=n-1 → pivot_mode=index"

// ❌ 초기화 기반 단언 — 금지
"boolean[] 변수는 VISITED로 분류"
"[False]*n으로 초기화된 배열은 VISITED"

// ✅ 사용 패턴 기반 — 올바른 형식
"2D 컬렉션이 셀 격자로 쓰이고 방향벡터로 이동하면 GRID"
"2D 컬렉션이 정점-정점 비용/연결을 담으면 GRAPH"
"ArrayDeque가 offer/poll 패턴으로 쓰이면 QUEUE, push/pop 패턴이면 STACK"
```

## GRID 맵 vs GRAPH 판단

- **2D 타일 맵** (미로, `board[i][j]`에 문자, BFS/DFS 4방 이동) → **GRID / GRID_LINEAR**
  - `graph_var_name`이나 GRAPH 패널에 `board`/`map` 등을 넣지 않는다
- **GRAPH** → 인접 리스트, 정점-간선 모델에만 사용
- **3D 상태 배열** (`visited[y][x][z]`, `dp[y][x][z]`) → GRID/GRID_LINEAR (GRAPH 아님)
- **방향 벡터 리스트** (`dirs`, `DIRS`, `delta`) → GRID/GRAPH 본체가 아닌 정적 변수. GRID 셀로 펼치지 말고 VARIABLES 패널에 유지

## linear_pivots 규칙

- **`index`** (기본): 런타임 값이 1D 배열의 첨자(정수 인덱스). "동일 배열의 양 끝에서 수렴·확장하며 접근하는 패턴"으로 판단.
- **`value_in_array`**: 런타임 값이 원소 값이며, 배열에서 그 값과 같은 첫 칸에 배지 표시 (퀵소트 피벗 등). "배열 원소 값을 대입받아 partition 기준으로 쓰이는 패턴"으로 판단. 이름이 `pivot`인지와 무관.
- **`indexes_1d_var`**: 여러 1D 배열이 있으면 어느 줄에 그릴지 명시. 단일 1D면 생략 가능.
- **`linear_context_var_names`**: 스텝 요약에 보일 스칼라 변수명.

## langSpecificHints 작성 기준

`route.ts`의 `langSpecificHints`를 추가·수정할 때:

- **허용** — varTypes 직렬화 힌트: `ArrayList → "list"`, `PriorityQueue → "heap"` 등. 단, 역할이 사용 패턴에 따라 달라지는 타입은 패턴별로 명시 (`ArrayDeque`: offer/poll → queue, push/pop → stack)
- **금지** — 타입→전략 단언: `"int[][]는 list2d로 분류"` 같은 문장
- **금지** — 이름→linear_pivots 단언: `"left, right → pivot_mode=index"` 같은 문장
- **올바른 형식** — 사용 패턴을 조건으로 기술: `"int[][] 변수가 셀 격자로 쓰이고 방향벡터로 이동하면 GRID"`

## 구현 시 동기화 필수

분류·시각화 규칙 변경 시 다음을 함께 맞춘다:

- 프롬프트 (`app/api/analyze/route.ts`)
- Gemini 스키마 (route.ts 내 structured output)
- `LinearPivotSpec` (`src/types/prova.ts`)
- `pointersAtIndexFromSpecs` (`src/features/visualization/linearPointerHelpers.ts`)

## 후처리 보강 모듈

- `src/lib/partitionPivotEnrichment.ts` — 퀵소트 피벗 감지 시 `pivot_mode: value_in_array` 보강
- `route.ts`에 장문 정규식 인라인 금지 → `src/lib/` 아래 별도 파일로 분리
- 언어별 fallback 패턴: `src/lib/{language}FallbackHints.ts`로 분리

## Test Coverage

유닛 테스트: POST 요청 처리
- [ ] 정상 code + varTypes → AnalyzeMetadata 응답
- [ ] 빈 code → 400 에러
- [ ] code > 5000자 → 3200자로 compaction 후 정상 처리
- [ ] varTypes > 40개 → 40개로 truncate 후 정상 처리

JSON 파싱 (tryParseAnalyzeJson):
- [ ] 정상 JSON → 파싱 성공
- [ ] 스마트 따옴표 / trailing comma → sanitize 후 파싱
- [ ] 마크다운 코드펜스 감싸진 JSON → 스트립 후 파싱
- [ ] 완전 깨진 응답 → null 반환 → fallbackAnalyzeMetadata 사용

normalizeResponse 검증:
- [ ] 유효하지 않은 strategy → "LINEAR" 기본값
- [ ] var_mapping에 varTypes에 없는 변수 → 필터링 제거
- [ ] tags > 20개 → 10개로 truncate + kebab-case 정규화
- [ ] linear_pivots에 존재하지 않는 변수 → 필터링 제거
- [ ] special_var_kinds 화이트리스트 외 값 → 무시

후처리 보강 (enrichment):
- [ ] 퀵소트 코드 → `pivot_mode: "value_in_array"` 자동 추가
- [ ] Python deque + popleft → QUEUE 감지 / pop → STACK 감지
- [ ] JS push+pop → STACK / shift+unshift → QUEUE 감지
- [ ] 방향벡터 변수 (dirs, delta) → var_mapping에서 제거
- [ ] graph_mode 미지정 → 코드 패턴으로 directed/undirected 추론
- [ ] heapq 패턴 → special_var_kinds HEAP 추가
- [ ] two-pointer 패턴 (int 변수 2개 이상 같은 배열 인덱싱) → linear_pivots 자동 생성

AI 프로바이더 폴백:
- [ ] 메인 프로바이더 토큰 초과 → 폴백 프로바이더 자동 전환
- [ ] 인증 에러 → 즉시 중단 (폴백 시도 안 함)
- [ ] 전체 실패 → fallbackAnalyzeMetadata 반환 (200 응답)
