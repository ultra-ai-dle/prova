# Prova 아키텍처 분석 & 다국어 확장 가이드

> Python 코드를 입력받아 알고리즘을 시각화하는 Prova의 전체 구조와, 새 언어를 추가할 때의 구현 비용을 정리한 문서입니다.

---

## 1. 디렉토리 구조

```
prova/
├── app/                              # Next.js App Router (프론트엔드 + API)
│   ├── api/analyze/route.ts          # [서버] AI 알고리즘 분류 API 엔드포인트
│   ├── layout.tsx                    # 루트 레이아웃
│   ├── page.tsx                      # 메인 페이지 (코드 에디터 + 시각화 패널)
│   └── globals.css
│
├── src/
│   ├── config/
│   │   └── provaRuntime.ts           # 실행 제한 설정 (timeout, maxSteps 등)
│   │
│   ├── types/
│   │   └── prova.ts                  # 파이프라인 전체에서 쓰이는 TypeScript 타입
│   │
│   ├── features/
│   │   ├── execution/
│   │   │   └── runtime.ts            # Web Worker 라이프사이클 관리 (ProvaRuntime)
│   │   ├── trace/
│   │   │   └── merge.ts              # rawTrace + AI 어노테이션 → 최종 표시용 trace 병합
│   │   ├── playback/
│   │   │   └── TimelineControls.tsx  # 스텝 재생/탐색 UI
│   │   └── visualization/
│   │       ├── GridLinearPanel.tsx   # 2D 그리드 + 1D 배열 시각화 (DP, 정렬 등)
│   │       ├── GraphPanel.tsx        # 그래프/네트워크 시각화 (d3-force 기반)
│   │       ├── ThreeDVolumePanel.tsx # 3D DP 테이블 시각화 (Three.js)
│   │       └── linearPointerHelpers.ts # 인덱스/값 포인터 하이라이팅
│   │
│   ├── lib/
│   │   ├── graphModeInference.ts         # 방향 그래프 vs 무방향 그래프 자동 감지
│   │   ├── partitionPivotEnrichment.ts   # 퀵소트 피벗 감지 (정규식)
│   │   └── tagNormalize.ts               # 태그 중복 제거 및 kebab-case 정규화
│   │
│   └── store/
│       └── useProvaStore.ts          # Zustand 전역 상태 관리
│
├── public/worker/
│   └── pyodide.worker.js             # ★ Python 실행 + 트레이싱 엔진 (425줄)
│
└── docs/
    ├── pitch/
    ├── ui/
    └── qa-questions.tsv
```

---

## 2. Python 코드 처리 파이프라인 (3단계)

### Stage 1 — 코드 실행 & 트레이스 수집 (클라이언트 Worker)

**파일:** `public/worker/pyodide.worker.js`

```
사용자 코드 + stdin 입력
        │
        ▼
  Pyodide.loadPyodide()   ← Python 3.11 WebAssembly 런타임 (CDN v0.26.4)
        │
        ▼
  compile() + sys.settrace() 훅 설정
        │
        ▼
  exec(code) — 한 줄씩 실행 & 스냅샷 캡처
  각 스텝마다 수집:
    • step (실행 순서)
    • line (소스 코드 줄 번호)
    • vars (현재 보이는 모든 변수값, 직렬화됨)
    • scope (함수명, 깊이)
    • stdout (print 출력)
    • runtimeError (있다면)
        │
        ▼
  varTypes 추출 (변수명 → 타입 문자열)
  예: { "arr": "list", "n": "int", "graph": "dict" }
        │
        ▼
  메인 스레드로 결과 전송:
  {
    rawTrace: RawTraceStep[],
    varTypes: Record<string, string>
  }
```

**주요 구현 세부사항:**
- **런타임:** Pyodide (CPython 3.11 → WebAssembly) — 브라우저 내에서 Python을 실행
- **실행 추적:** `sys.settrace()` 훅으로 매 줄 실행마다 콜백
- **변수 직렬화:** `_safe()` 함수가 모든 로컬/전역 변수를 JSON-안전한 구조로 변환
  - 직렬화 깊이 제한: 3단계 (초과 시 `repr()` 문자열)
  - 루트 레벨 컬렉션: 최대 30개 원소
  - 중첩 컬렉션: 최대 12개 원소
- **심볼 필터링:** Python `ast.parse()`로 유저 정의 변수만 추출 (내장/임포트 제외)
- **제한값 (`provaRuntime.ts`):** 타임아웃 120초, 최대 10,000 스텝

---

### Stage 2 — 알고리즘 분류 (서버 AI)

**파일:** `app/api/analyze/route.ts`

```
POST /api/analyze
입력: { code: string, varTypes: Record<string, string> }
        │
        ▼
  Gemini 2.5 Flash Lite 또는 GPT-4o Mini 호출
  (1,600줄짜리 시스템 프롬프트)
        │
        ▼
  JSON 응답:
  {
    algorithm: "BFS",
    strategy: "GRID_LINEAR",          // 시각화 전략 선택
    var_mapping: {                     // 역할 → 변수명 매핑
      "GRAPH": { var_name: "graph", panel: "GRAPH" },
      "PRIMARY": { var_name: "queue", panel: "LINEAR" }
    },
    graph_mode: "undirected",
    linear_pivots: [...],              // 배열 포인터 사양
    time_complexity: "O(V+E)",
    tags: ["bfs", "graph-traversal"]
  }
        │
        ▼
  후처리 정규화:
    • normalizeResponse()             — 전략/패널/변수명 유효성 검증
    • enrichWithPartitionValuePivots() — 퀵소트 피벗 자동 감지
    • applyDequeHints()               — queue/stack 오퍼레이션 태깅
    • applyGraphModeInference()       — 그래프 방향성 시맨틱 추론
```

---

### Stage 3 — 시각화 렌더링 (클라이언트 UI)

**파일:** `src/features/visualization/*.tsx`

```
rawTrace + analyzeMetadata
        │
        ▼
  merge.ts → MergedTraceStep[] 생성
        │
        ▼
  strategy에 따라 패널 선택:
  ┌─────────────────────────────────────────────────────┐
  │ GRID       → GridLinearPanel (2D 그리드)             │
  │ LINEAR     → GridLinearPanel (1D 배열 + 포인터 링)   │
  │ GRID_LINEAR→ 위 두 개 동시                           │
  │ GRAPH      → GraphPanel (d3 force-directed)          │
  │ [3D DP]    → ThreeDVolumePanel (Three.js)            │
  └─────────────────────────────────────────────────────┘
        │
        ▼
  Zustand store (useProvaStore)로 현재 스텝 관리
  TimelineControls로 재생/탐색
```

---

## 3. 핵심 데이터 타입 (`src/types/prova.ts`)

```typescript
// Worker → 메인 스레드
interface RawTraceStep {
  step: number;
  line: number;
  vars: Record<string, unknown>;    // 변수명 → 직렬화된 값
  scope: { func: string; depth: number };
  stdout?: string[];
  runtimeError: { type, message, line } | null;
}

// AI API 응답
interface AnalyzeMetadata {
  algorithm: string;
  display_name: string;
  strategy: "GRID" | "LINEAR" | "GRID_LINEAR" | "GRAPH";
  tags: string[];
  key_vars: string[];
  var_mapping: Record<string, { var_name: string; panel: string }>;
  linear_pivots?: LinearPivotSpec[];
  graph_mode?: "directed" | "undirected";
  graph_var_name?: string;
  time_complexity?: string;
}

// trace/merge.ts 출력
interface MergedTraceStep extends RawTraceStep {
  explanation: string;
  visual_actions: string[];
}
```

---

## 4. 언어별 코드 분리 현황

### Python 전용 코드 (새 언어 추가 시 교체 필요)

| 파일 | 역할 | 포터빌리티 |
|------|------|-----------|
| `public/worker/pyodide.worker.js` | Python 실행 엔진, 트레이서, 변수 직렬화 | Python 전용 |
| `app/page.tsx` (일부) | Python 키워드 하이라이팅, 문자열/주석 정규식 | Python 전용 |

### 언어 무관 코드 (재사용 가능)

| 파일 | 역할 | 재사용 가능 여부 |
|------|------|----------------|
| `app/api/analyze/route.ts` | AI 분류, JSON 정규화, 재시도 로직 | 완전 재사용 가능 |
| `src/features/visualization/*.tsx` | 시각화 엔진 (d3, Three.js) | 완전 재사용 가능 |
| `src/store/useProvaStore.ts` | 전역 상태 관리 | 완전 재사용 가능 |
| `src/types/prova.ts` | 타입 정의 | 거의 재사용 가능 |
| `src/lib/*.ts` | 그래프 추론, 태그 정규화 등 | 재사용 가능 |

---

## 5. 새 언어 추가 시 구현 비용

### 필요한 작업 요약

```
새 언어 추가 = [언어 실행 엔진 Worker] + [심볼 추출기] + (AI 프롬프트 조정) + (UI 키워드 하이라이팅)
```

### 구성요소별 비용

| 구성요소 | 난이도 | 예상 작업량 | 비고 |
|----------|--------|------------|------|
| **실행 엔진 + 트레이서** | 매우 높음 | ~2,000 LOC | 언어별 런타임 필요 |
| **심볼 추출기 (AST)** | 높음 | ~500 LOC | 언어별 파서 필요 |
| **AI 프롬프트 조정** | 중간 | ~300 LOC | 언어 문법 패턴 추가 |
| **UI 키워드 하이라이팅** | 낮음 | ~100 LOC | 완전 재사용 가능 |

### 언어별 접근 방식 & 상대적 비용

#### JavaScript / TypeScript
- **접근:** Babel/Acorn으로 AST 파싱 + 코드 계측(instrumentation) 후 실행
- **트레이서:** `Proxy` 객체 또는 코드 변환으로 변수 스냅샷 수집 (settrace 직접 대응 없음)
- **실행 환경:** 브라우저에서 직접 실행 가능 (iframe sandbox 등)
- **난점:** async/await, Promise, 클로저 직렬화
- **예상 비용:** Python 대비 **1.5배**

#### Go
- **접근:** Go → WebAssembly 컴파일 후 브라우저 실행
- **트레이서:** 빌드 시 계측(instrumentation) 삽입 또는 `runtime.Callers`
- **실행 환경:** `wasm_exec.js` 브라우저 바인딩으로 가능
- **예상 비용:** Python 대비 **1.5배**

#### Java / C#
- **접근:** 서버사이드 실행 + WebSocket/SSE로 스트리밍이 현실적
- **트레이서:** JVMTI 에이전트 (Java) 또는 IL Rewriting (C#)
- **난점:** 아키텍처 변경 필요 (서버 실행 인프라)
- **예상 비용:** Python 대비 **2.5~3배**

#### C / C++
- **접근:** 원격 서버에서 컴파일 + GDB/LLDB 디버거 연동
- **난점:** 브라우저 내 안전 실행 불가, 포인터/메모리 직렬화
- **예상 비용:** Python 대비 **3~4배** + 서버 인프라 필요

### 최소 비용 추가 순서 (권장)

```
JavaScript/TypeScript  →  Go/Rust  →  Java/C#  →  C/C++
       (브라우저 실행 가능)        (WASM 가능)    (서버 필요)   (서버 필요)
```

---

## 6. 새 언어 추가 체크리스트

새 언어(예: JavaScript)를 추가한다고 가정한 최소 구현 목록:

- [ ] `public/worker/{lang}.worker.js` 작성 — 언어 실행 + 트레이서 구현
  - RawTraceStep 인터페이스와 동일한 구조로 출력해야 함
  - `{ step, line, vars, scope, stdout, runtimeError }` 포맷 유지
- [ ] `src/features/execution/runtime.ts` — 새 Worker 로드 로직 추가
- [ ] `app/page.tsx` — 언어 선택 UI + 해당 언어 키워드 하이라이팅
- [ ] `app/api/analyze/route.ts` — AI 프롬프트에 언어별 문법 패턴 추가
  - (예: `.push()` / `.pop()`, `for...of`, 화살표 함수 등)
- [ ] `src/types/prova.ts` — 필요 시 타입 확장 (대부분 재사용 가능)

**시각화 엔진(`visualization/`)과 상태 관리(`store/`)는 수정 불필요.**

---

## 7. 전체 흐름 요약

```
[사용자 코드 입력]
       │
       ▼
[Web Worker: 언어 런타임 실행 + sys.settrace/계측]   ← 언어마다 교체 필요
       │ rawTrace[], varTypes
       ▼
[API /analyze: AI가 알고리즘 분류 + var_mapping 생성]  ← 거의 재사용 가능
       │ analyzeMetadata
       ▼
[UI: strategy에 따라 GridPanel / GraphPanel / 3D 렌더링]  ← 완전 재사용
       │
       ▼
[TimelineControls: 스텝별 재생 및 설명 표시]            ← 완전 재사용
```

**결론:** 새 언어 추가의 핵심 비용은 **Worker 레이어(실행 엔진 + 트레이서)**에 집중됩니다. 시각화, AI 분류, 상태 관리는 언어에 무관하게 재사용 가능하도록 잘 분리되어 있습니다.
