# 예제 갤러리 설계 문서

> 작성일: 2026-04-12
> 목적: 학습자가 바로 실행해볼 수 있는 큐레이션된 알고리즘 예제를 제공하여 진입장벽을 낮춘다.

---

## 1. 현재 상태 분석

### 예제 시스템: 없음

| 항목 | 현재 상태 |
|------|----------|
| 예제 데이터 파일 | 없음 (JSON, TS 상수, 별도 파일 모두 부재) |
| 카테고리/태그 구조 | 없음 (태그는 AI가 실행 시 동적 생성) |
| page.tsx 예제 관련 코드 | localStorage에서 마지막 실행 코드 복원만 존재 |
| 해시태그 출처 | `/api/analyze` → AI 응답 → `tagNormalize.ts` 정규화 → UI |

### 관련 코드 위치

- 코드 상태: `page.tsx` 로컬 state (`code`, `language`)
- stdin 상태: Zustand store (`setStdin`)
- localStorage 키: `prova:lastExecutedCode`, `prova:lastExecutedStdin`, `prova:lastSelectedLanguage`
- 모달/다이얼로그 컴포넌트: 없음 (인라인 배너 + 토스트만 존재)
- 아이콘: `src/components/icons/AppIcons.tsx` — `IconFiles` 활용 가능

---

## 2. 큐레이션 전략

### 카테고리 구성 (6개)

| 카테고리 | 키 | 한글 | 선정 이유 |
|----------|-----|------|----------|
| Sorting | `sorting` | 정렬 | 배열 스왑 시각화가 가장 직관적 |
| Search | `search` | 탐색 | 포인터/피벗 움직임이 명확 |
| Data Structure | `data-structure` | 자료구조 | 스택/큐/힙 특수 렌더링 활용 |
| Graph | `graph` | 그래프 | GraphPanel 활용 극대화 |
| DP | `dp` | 동적 프로그래밍 | 2D 그리드 테이블 채우기 |
| Recursion | `recursion` | 재귀/백트래킹 | 콜트리 시각화 |

### 카테고리별 대표 예제 (총 ~20개)

선정 기준: **코드 15줄 이내** + **시각화 효과 뚜렷** + **초보자 친화**

| 카테고리 | 예제 | 난이도 | 시각화 강점 |
|----------|------|--------|------------|
| **정렬** | Bubble Sort | Easy | 인접 원소 스왑 |
| | Selection Sort | Easy | min 탐색 + 스왑 |
| | Insertion Sort | Easy | 삽입 위치 탐색 |
| **탐색** | Binary Search | Easy | 범위 축소 과정 |
| | Linear Search | Easy | 순차 스캔 |
| | Two Pointers | Medium | 양쪽 포인터 수렴 |
| **자료구조** | Stack — 괄호 매칭 | Easy | LIFO 시각화 |
| | Queue — BFS 레벨 | Easy | FIFO 시각화 |
| | Min Heap Push/Pop | Medium | 힙 구조 변화 |
| **그래프** | BFS | Easy | 레벨별 탐색 확산 |
| | DFS | Easy | 깊이 우선 경로 |
| | Dijkstra | Medium | 최단거리 갱신 |
| | Union-Find | Medium | 컴포넌트 병합 |
| **DP** | Fibonacci (메모이제이션) | Easy | 1D 테이블 채우기 |
| | 0/1 Knapsack | Medium | 2D 그리드 채우기 |
| | LCS | Medium | 2D 그리드 채우기 |
| **재귀** | Factorial | Easy | 콜스택 시각화 |
| | Tower of Hanoi | Medium | 재귀 트리 |
| | N-Queens (4×4) | Medium | 백트래킹 상태 변화 |

### "더 보기" 처리

- 카테고리 내 `featured === true`인 예제만 초기 노출 (3~4개)
- "더 보기 (+N개)" 클릭 → 해당 카테고리 전체 펼침
- **검색 기능은 1차 출시에서 제외** — 20개 큐레이션이면 충분, 전체 50개 이상 시 추가 검토

---

## 3. 갤러리 UX 설계

### 진입점

헤더 우측, 투어 아이콘 왼쪽에 갤러리 버튼 배치:

```
┌──── Header (48px) ─────────────────────────────────────────────┐
│  Prova 로고   │   [알고리즘 배지]   │  [📂 갤러리] [? 투어]   │
└────────────────────────────────────────────────────────────────┘
```

- 아이콘: `IconFiles` (AppIcons.tsx에 기존 존재)
- 크기: `h-7 w-7` (투어 버튼과 동일)
- 툴팁: "예제 갤러리"

### 갤러리 방식: 센터 모달

사이드패널은 3열 레이아웃 충돌, 드롭다운은 공간 부족 → **고정 오버레이 모달 (max-w-2xl)**

```
┌─────────────────────────────────────────────────┐
│  예제 갤러리                              [✕]   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ ● 정렬   │  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│   탐색   │  │ Bubble  │ │Selection│ │Insert  │ │
│   자료구조│  │ Sort    │ │ Sort   │ │ Sort   │ │
│   그래프  │  │ ★ Easy  │ │ ★ Easy │ │ ★ Easy │ │
│   DP     │  │ #array  │ │ #array │ │ #array │ │
│   재귀   │  └─────────┘ └─────────┘ └────────┘ │
│          │                                      │
│          │  + 더 보기 (2개)                      │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│  Python · JavaScript 지원 | 선택하면 에디터에 로드  │
└─────────────────────────────────────────────────┘
```

### 카드 구성

각 예제 카드에 표시할 정보:

```
┌─────────────────────┐
│ Bubble Sort  버블정렬│
│                     │
│ [Py] [JS] [Java]    │  ← variants에 있는 언어만 표시
│                     │
│ ★ Easy  #sorting    │
└─────────────────────┘
```

| 필드 | 예시 | 비고 |
|------|------|------|
| 제목 | "Bubble Sort" | 영문 (국제적) |
| 한글명 | "버블 정렬" | 서브텍스트 |
| 언어 토글 | `[Py] [JS]` | variants에 있는 언어만 pill 버튼으로 표시 |
| 난이도 | ★ Easy | 초록 뱃지 / ★★ Medium 노란 뱃지 |
| 태그 | `#sorting` `#array` | 최대 2개 |

- variants가 1개면 언어 토글 미표시
- 선택된 언어 pill은 강조 (파란 테두리)
- 카드 클릭 시 현재 선택된 언어의 variant로 로드

### 선택 후 흐름

**덮어쓰기 확인: 인라인 다이얼로그** (`window.confirm` 사용하지 않음)

모달 내부에 카드 영역을 대체하는 인라인 확인 UI를 표시한다:

```
┌─────────────────────────────────────────────────┐
│  예제 갤러리                              [✕]   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ ● 정렬   │  ┌──────────────────────────────────┐│
│   탐색   │  │  현재 코드를 덮어쓸까요?          ││
│   자료구조│  │  "Bubble Sort" 예제로 교체됩니다. ││
│   그래프  │  │                                  ││
│   DP     │  │      [ 취소 ]   [ 확인 ]         ││
│   재귀   │  └──────────────────────────────────┘│
│          │                                      │
├──────────┴──────────────────────────────────────┤
│  Python · JavaScript 지원 | 선택하면 에디터에 로드  │
└─────────────────────────────────────────────────┘
```

```
사용자가 카드 클릭
  ├── 현재 코드 비어있음 → 즉시 로드
  ├── 현재 코드 === localStorage 기본값 → 즉시 로드
  └── 현재 코드 수정됨 → 인라인 다이얼로그 표시
       ├── 확인 → 로드
       └── 취소 → 카드 그리드로 복귀

로드 시:
  1. code ← example.code
  2. stdin ← example.stdin
  3. language ← example.language (자동 전환)
  4. 모달 닫기
  5. 자동 실행 안 함 (사용자가 코드를 먼저 읽도록 유도)
```

---

## 4. 데이터 구조 설계

### 파일 위치

```
src/data/
├── examples.ts          # 타입 정의 + 전체 예제 데이터
└── (단일 파일로 충분 — 50개 미만이면 분리 불필요)
```

### 타입 정의

`src/types/prova.ts`에 추가하지 않음 — 시각화 파이프라인과 무관한 독립 데이터.

```typescript
// src/data/examples.ts

export type ExampleCategory =
  | "sorting"
  | "search"
  | "data-structure"
  | "graph"
  | "dp"
  | "recursion";

export interface CategoryMeta {
  key: ExampleCategory;
  label: string;        // "정렬"
  labelEn: string;      // "Sorting"
}

export interface ExampleVariant {
  language: "python" | "javascript" | "java";
  code: string;
  stdin: string;
}

export interface ExampleItem {
  id: string;                    // "bubble-sort"
  title: string;                 // "Bubble Sort"
  titleKo: string;               // "버블 정렬"
  category: ExampleCategory;
  tags: string[];                // ["sorting", "array"]
  difficulty: "easy" | "medium";
  variants: ExampleVariant[];    // 언어별 코드. 1차는 python만
  featured: boolean;             // true → 갤러리 초기 노출
}
```

### 큐레이션 구분

- `featured: true` — 카테고리별 상위 3~4개
- 갤러리 초기: `examples.filter(e => e.featured)` 만 표시
- "더 보기": `examples.filter(e => e.category === selected)` 전체 표시
- 순서: 배열 내 순서 = 표시 순서

### 데이터 예시

```typescript
export const CATEGORIES: CategoryMeta[] = [
  { key: "sorting",        label: "정렬",          labelEn: "Sorting" },
  { key: "search",         label: "탐색",          labelEn: "Search" },
  { key: "data-structure", label: "자료구조",       labelEn: "Data Structure" },
  { key: "graph",          label: "그래프",         labelEn: "Graph" },
  { key: "dp",             label: "DP",            labelEn: "Dynamic Programming" },
  { key: "recursion",      label: "재귀",          labelEn: "Recursion" },
];

export const EXAMPLES: ExampleItem[] = [
  {
    id: "bubble-sort",
    title: "Bubble Sort",
    titleKo: "버블 정렬",
    category: "sorting",
    tags: ["sorting", "array"],
    difficulty: "easy",
    featured: true,
    variants: [
      {
        language: "python",
        code: `...`,
        stdin: "6\n5 3 8 1 4 2",
      },
      {
        language: "javascript",
        code: `...`,
        stdin: "6\n5 3 8 1 4 2",
      },
      // Java는 추가 시 여기에 append
    ],
  },
  // ... 추가 예제
];
```

---

## 5. Phase별 상세 작업 계획

### Phase 1: 예제 데이터 작성 (수동)

#### 1-1. featured 예제 목록 — mocks 파일 매핑

| 예제 ID | mocks 파일 경로 | title | titleKo | difficulty | tags | featured |
|---------|----------------|-------|---------|------------|------|----------|
| `bubble-sort` | `algorithms/sort/bubble/python.md` | Bubble Sort | 버블 정렬 | easy | `sorting`, `array` | true |
| `selection-sort` | `algorithms/sort/selection/python.md` | Selection Sort | 선택 정렬 | easy | `sorting`, `array` | true |
| `insertion-sort` | `algorithms/sort/insertion/python.md` | Insertion Sort | 삽입 정렬 | easy | `sorting`, `array` | true |
| `binary-search` | `algorithms/binary-search/python.md` | Binary Search | 이진 탐색 | easy | `search`, `array` | true |
| `two-pointers` | `algorithms/two-pointers/python.md` | Two Pointers | 투 포인터 | medium | `search`, `array` | true |
| `sliding-window` | `algorithms/sliding-window/python.md` | Sliding Window | 슬라이딩 윈도우 | medium | `search`, `array` | true |
| `stack` | `data-structures/stack/python.md` | Stack | 스택 | easy | `data-structure`, `stack` | true |
| `queue` | `data-structures/queue/python.md` | Queue | 큐 | easy | `data-structure`, `queue` | true |
| `priority-queue` | `data-structures/priority-queue/python.md` | Priority Queue | 우선순위 큐 | medium | `data-structure`, `heap` | true |
| `bfs` | `algorithms/route/bfs/python.md` | BFS | 너비 우선 탐색 | easy | `graph`, `traversal` | true |
| `dfs` | `algorithms/route/dfs/python.md` | DFS | 깊이 우선 탐색 | easy | `graph`, `traversal` | true |
| `dijkstra` | `algorithms/route/dijkstra/python.md` | Dijkstra | 다익스트라 | medium | `graph`, `shortest-path` | true |
| `union-find` | `data-structures/union-find/python.md` | Union-Find | 유니온 파인드 | medium | `graph`, `disjoint-set` | true |
| `fibonacci` | `algorithms/dp/fibonacci/python.md` | Fibonacci (DP) | 피보나치 (DP) | easy | `dp`, `memoization` | true |
| `knapsack-01` | `algorithms/dp/knapsack-01/python.md` | 0/1 Knapsack | 0/1 배낭 | medium | `dp`, `2d-table` | true |
| `lcs` | `algorithms/dp/lcs/python.md` | LCS | 최장 공통 부분수열 | medium | `dp`, `2d-table` | true |
| `prefix-sum` | `algorithms/prefix-sum/python.md` | Prefix Sum | 누적합 | easy | `array`, `prefix-sum` | true |
| `factorial` | **mocks 없음** — 직접 작성 | Factorial | 팩토리얼 | easy | `recursion`, `call-stack` | true |
| `tower-of-hanoi` | **mocks 없음** — 직접 작성 | Tower of Hanoi | 하노이의 탑 | medium | `recursion`, `divide-and-conquer` | true |
| `n-queens` | **mocks 없음** — 직접 작성 | N-Queens (4×4) | N-Queens (4×4) | medium | `recursion`, `backtracking` | true |

> **참고**: 20개 중 17개는 mocks에서 code + stdin 복사 가능. 3개(factorial, tower-of-hanoi, n-queens)는 직접 작성.
> 설계 초안의 "Linear Search"는 mocks에 없으므로 mocks에 있는 `prefix-sum`과 `sliding-window`로 교체.

#### 1-2. examples.ts 작성 순서

1. 타입 정의 (`ExampleCategory`, `CategoryMeta`, `ExampleVariant`, `ExampleItem`)
2. 카테고리별 featured 예제 데이터 작성
   - mocks에서 python.md + javascript.md → variants 배열로 복사 (17개)
   - 직접 작성 (3개: factorial, tower-of-hanoi, n-queens — Python + JS 모두)
3. 메타데이터(title, titleKo, difficulty, tags, featured) 수동 작성
4. 각 예제 실행 테스트 (Python + JS 모두 정상 동작 확인)

#### 1-3. 향후 확장 고려

나중에 전체 목록이 필요해지면 빌드타임 파서로 전환 가능하도록
mocks 파일 구조와 `examples.ts` 타입을 호환되게 유지한다:
- mocks의 디렉토리명 → `ExampleItem.id`
- mocks의 `python.md` / `javascript.md` → `ExampleVariant[]`
- 메타데이터(title, difficulty, tags)는 mocks에 frontmatter 추가로 해결 가능
- Java variant는 mocks `java.md`에서 동일 방식으로 추가

### Phase 2: 갤러리 UI

#### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/features/gallery/useGallery.ts` | 모달 열기/닫기 + 카테고리 선택 + 덮어쓰기 확인 상태 |
| `src/features/gallery/ExampleCard.tsx` | 개별 예제 카드 (제목, 언어 토글, 난이도 뱃지, 태그) |
| `src/features/gallery/ExampleGallery.tsx` | 갤러리 모달 (카테고리 탭 + 카드 그리드 + 더보기 + 인라인 덮어쓰기 다이얼로그) |

#### 작업 순서

1. `useGallery.ts` — `isOpen`, `selectedCategory`, `confirmTarget` (덮어쓰기 대상) 상태
2. `ExampleCard.tsx` — 카드 UI (클릭 → `onSelect(example)`)
3. `ExampleGallery.tsx` — 모달 레이아웃, 카테고리 필터, 카드 그리드, 인라인 확인 다이얼로그, ESC 닫기

### Phase 3: page.tsx 연결

#### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/page.tsx` | 헤더에 갤러리 버튼 추가, ExampleGallery 마운트, onSelect 핸들러 |
| `src/components/icons/AppIcons.tsx` | 갤러리 전용 아이콘 추가 (또는 IconFiles 재활용) |

#### 작업 순서

1. `AppIcons.tsx` — 갤러리 아이콘 추가 (필요 시)
2. `page.tsx` — 헤더 우측에 갤러리 버튼 (`IconFiles`, 투어 아이콘 왼쪽)
3. `page.tsx` — `ExampleGallery` 마운트 + `onSelect` 핸들러:
   - 코드 비어있음 / 기본값 → 즉시 로드
   - 코드 수정됨 → 인라인 다이얼로그 (확인 시 로드, 취소 시 카드 그리드 복귀)
   - 로드: `setCode(example.code)`, `setStdin(example.stdin)`, `setLanguage(example.language)` → 모달 닫기

### 예상 난이도 및 리스크

| 항목 | 난이도 | 리스크 | 대응 |
|------|--------|--------|------|
| 예제 데이터 작성 | 중 | 코드가 Worker에서 실행 안 될 수 있음 | 각 예제 실행 테스트 필수 |
| 모달 UI 신규 구현 | 낮 | 기존 모달 없어서 새로 만듦 | Tailwind + fixed overlay로 간단 구현 |
| 인라인 덮어쓰기 다이얼로그 | 낮 | — | 갤러리 모달 내부 상태로 처리 |
| page.tsx 연결 | 낮 | 로컬 state라 props 전달만으로 충분 | — |
| 100vh 레이아웃 | 없음 | 모달은 fixed overlay라 레이아웃 무관 | — |
| ESC 키 충돌 | 낮 | 에디터 ESC와 모달 ESC 충돌 가능 | 모달 열림 시 에디터 포커스 해제 |

---

## 6. 가이드 투어 연동

갤러리 버튼에 `data-tour="gallery"` 속성을 부여하고, 투어 마지막 스텝(8번)으로 추가.
핵심 기능(에디터 → 실행 → 시각화 → 컨트롤 → 변수)을 먼저 소개한 뒤,
"이제 직접 탐색해 보세요"로 마무리하여 갤러리를 안내한다.

| 스텝 | target | title | placement |
|------|--------|-------|-----------|
| 8 (마지막) | `[data-tour="gallery"]` | 예제 갤러리 | bottom-right |

- body: `이제 직접 탐색해 보세요!\n여기를 눌러 정렬, 탐색, 그래프 등 다양한 알고리즘 예제를 바로 불러올 수 있습니다.`
- `bottom-right` placement는 GuidedTour.tsx에 신규 추가 — 말풍선 오른쪽 끝을 버튼 오른쪽에 맞춤
- 수정 파일: `tourSteps.ts`, `GuidedTour.tsx`, `page.tsx`

---

## 7. 향후 확장 고려사항 (1차 범위 밖)

- 검색 기능: 전체 예제 50개 이상 시
- 사용자 즐겨찾기: localStorage 기반
- 커뮤니티 예제 제출: 별도 백엔드 필요
- 예제별 미리보기 썸네일: 정적 스크린샷 또는 동적 생성
- 다국어 코드 (Python + JS 동시 제공): variants 구조로 이미 지원
