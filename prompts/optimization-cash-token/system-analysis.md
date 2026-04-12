# Prova 시스템 아키텍처 분석

> 분석 기준일: 2026-04-11  
> 브랜치: `geunseon/optimization`

---

## 목차

1. [폴더 구조](#1-폴더-구조)
2. [데이터 흐름 및 캐싱 로직](#2-데이터-흐름-및-캐싱-로직)
3. [AI API 워크플로우](#3-ai-api-워크플로우)
4. [최적화 제안](#4-최적화-제안)

---

## 1. 폴더 구조

```
prova/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts          # AI 알고리즘 분석 엔드포인트 (AnalyzeMetadata 반환)
│   │   └── explain/
│   │       └── route.ts          # AI 단계별 설명 스트리밍 엔드포인트 (SSE, 현재 미사용)
│   ├── layout.tsx
│   └── page.tsx                  # 메인 UI 컴포넌트 (실행 조율 + 캐시 관리 로직 포함)
├── src/
│   ├── config/
│   │   └── provaRuntime.ts       # 트레이스 한도, 타임아웃 등 런타임 설정
│   ├── features/
│   │   ├── execution/
│   │   │   └── runtime.ts        # Web Worker 관리 (Pyodide/JS 실행 엔진)
│   │   ├── playback/
│   │   │   └── TimelineControls.tsx  # 재생/일시정지/스텝 이동 UI
│   │   ├── trace/
│   │   │   └── merge.ts          # RawTrace + AI 주석 병합 로직
│   │   └── visualization/
│   │       ├── GraphPanel.tsx        # 그래프 시각화 (D3.js)
│   │       ├── GridLinearPanel.tsx   # 2D 그리드 / 1D 선형 / 3D 볼륨 시각화 (Three.js)
│   │       ├── ThreeDVolumePanel.tsx # 3D 볼륨 전용 렌더러 (Three.js)
│   │       └── linearPointerHelpers.ts  # 1D 배열 피벗 위치 계산
│   ├── lib/
│   │   ├── ai-providers.ts           # 멀티 프로바이더 AI 디스패처 (Gemini, OpenAI, Groq, Anthropic, OpenRouter)
│   │   ├── graphModeInference.ts     # 코드 패턴으로 그래프 방향성 추론
│   │   ├── partitionPivotEnrichment.ts  # 선형 피벗 스펙 보강
│   │   └── tagNormalize.ts           # 알고리즘 태그 중복 제거 및 정규화
│   ├── store/
│   │   └── useProvaStore.ts          # Zustand 전역 상태 관리
│   └── types/
│       └── prova.ts                  # 전체 TypeScript 인터페이스 정의
├── public/worker/
│   ├── pyodide.worker.js             # Python 실행 Web Worker (Pyodide 기반)
│   └── js.worker.js                  # JavaScript 실행 Web Worker
├── prompts/                          # 프롬프트 및 기획 문서
│   ├── extension-language/
│   ├── pitch/
│   └── ui/
├── .env                              # AI 프로바이더 API 키
└── package.json
```

---

## 2. 데이터 흐름 및 캐싱 로직

### 2-1. 전체 데이터 흐름

```
사용자 입력 (코드 + stdin)
        │
        ▼
┌─────────────────────────────────────┐
│  코드 실행  (Web Worker)             │
│  pyodide.worker.js / js.worker.js   │
│  • 각 줄 실행 시 변수 스냅샷 캡처    │
│  • 출력: RawTraceStep[], varTypes   │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  트레이스 정제  (app/page.tsx)       │
│  • Python 런타임 내부 노이즈 제거    │
│  • 사용자 선언 변수만 유지           │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  AI 분석  (/api/analyze)            │
│  캐시 키: language + code + varTypes│
│  • 캐시 히트 → 즉시 반환            │
│  • 캐시 미스 → AI 호출 후 캐시 저장 │
│  출력: AnalyzeMetadata              │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  시각화 렌더링 (client-side only)    │
│  • strategy → 컴포넌트 선택         │
│    GRAPH    → GraphPanel (D3.js)    │
│    GRID/    → GridLinearPanel       │
│    LINEAR      (Three.js)          │
│  • 각 스텝의 변수 상태를 즉시 렌더링 │
└─────────────────────────────────────┘
```

### 2-2. 캐싱 메커니즘 상세

#### 캐시 위치

| 항목                              | 내용                                                                |
| --------------------------------- | ------------------------------------------------------------------- |
| **파일**                          | `app/page.tsx`                                                      |
| **캐시 저장소**                   | `useRef<Map<string, AnalyzeMetadata>>` (in-memory, 클라이언트 전용) |
| **캐시 수명**                     | 현재 페이지 세션 (새로고침 시 소멸)                                 |
| **localStorage / sessionStorage** | 미사용                                                              |
| **서버 사이드 캐시 (Redis 등)**   | 미사용                                                              |
| **HTTP 캐시**                     | 미사용 (`explain` 라우트에 `Cache-Control: no-cache` 명시)          |

#### 캐시 키 구성 — **"코드 + 입력값" 조합**

```typescript
// app/page.tsx
const analyzeKey = `${analyzeLanguage}\n@@\n${codeRef.current}\n@@\n${stableStringifyObject(sanitizedVarTypes)}\n@@\nmeta-v2-partition-pivot`;
```

캐시 키는 다음 4가지 요소로 구성된다:

1. **언어** (`python` | `javascript`)
2. **사용자 코드** (전문)
3. **변수 타입 맵** (`varTypes` — 런타임 실행 후 추출된 변수별 타입 정보)
4. **메타데이터 버전 식별자** (`meta-v2-partition-pivot`)

> 핵심: 캐시 기준은 **코드 단독이 아닌 코드 + 런타임 변수 타입(입력값 반영)** 의 조합이다.  
> 동일한 코드라도 `stdin` 입력값이 바뀌어 변수 타입이 달라지면 캐시 미스가 발생한다.

#### 캐시 조회 흐름

```
analyzeKey 생성
    │
    ├─ analyzeCacheRef.get(key) 존재? ──→ [HIT] 캐시된 AnalyzeMetadata 즉시 반환
    │
    ├─ analyzeInFlightRef.get(key) 존재? ──→ [IN-FLIGHT] 기존 Promise await (중복 요청 방지)
    │
    └─ 없음 ──→ [MISS]
          POST /api/analyze
          Promise를 analyzeInFlightRef에 저장
          응답 수신
          analyzeCacheRef에 결과 저장
          analyzeInFlightRef에서 제거
```

#### 캐시 대상 / 비대상

| 항목                                | 캐싱 여부  | 비고                     |
| ----------------------------------- | ---------- | ------------------------ |
| `AnalyzeMetadata` (AI 분석 결과)    | **캐시됨** | 가장 비싼 연산           |
| `RawTraceStep[]` (실행 트레이스)    | 미캐시     | 실행마다 재생성          |
| `MergedTraceStep[]` (병합 트레이스) | 미캐시     | `mergeTrace()` 매번 호출 |
| 시각화 렌더링 데이터                | 미캐시     | 현재 스텝에서 즉시 계산  |
| AI 단계 설명 주석 (explain)         | 해당 없음  | 현재 미사용              |

---

## 3. AI API 워크플로우

### 3-1. 지원 AI 프로바이더

`src/lib/ai-providers.ts` 에서 관리하며, `.env` 환경 변수로 설정한다.

| 프로바이더    | 환경 변수            |
| ------------- | -------------------- |
| Google Gemini | `GEMINI_API_KEY`     |
| OpenAI        | `OPENAI_API_KEY`     |
| Groq          | `GROQ_API_KEY`       |
| Anthropic     | `ANTHROPIC_API_KEY`  |
| OpenRouter    | `OPENROUTER_API_KEY` |

**폴백 체인 구조:**

```
Primary Provider (AI_PROVIDER + AI_MODEL)
    │  실패 (토큰 초과 / 오류)
    ▼
Fallback Provider (FALLBACK_PROVIDER + FALLBACK_MODEL)
    │  실패
    ▼
하드코딩 기본 메타데이터 (strategy: LINEAR, 패턴 기반 추론)
```

- 토큰 초과 감지: `context_length_exceeded`, `RESOURCE_EXHAUSTED`, HTTP 413
- 일시적 오류 재시도: 지수 백오프 (300ms × 2ⁱ, 최대 3회)

### 3-2. `/api/analyze` — 알고리즘 분석

**호출 시점:** 코드 실행 완료 후, `varTypes` 추출 직후 1회  
**호출 파일:** `app/page.tsx`  
**처리 파일:** `app/api/analyze/route.ts`

```
입력: { code, varTypes, language }
        │
        ▼
AI 프롬프트 생성 (~60개 분류 규칙)
        │
        ▼
AI 응답 수신 (JSON 구조화 출력)
        │
        ▼
후처리 파이프라인:
  1. enrichSpecialVarKinds()   — HEAP/QUEUE/STACK/SET 패턴 감지
  2. enrichLinearPivots()      — 투 포인터/슬라이딩 윈도우 감지
  3. applyDequeHints()         — 덱/큐 연산 감지
  4. applyDirectionMapGuards() — 방향 배열(정적 데이터) 필터링
  5. applyGraphModeInference() — 그래프 방향성 추론
        │
        ▼
출력: AnalyzeMetadata {
  algorithm,        // 알고리즘 이름
  display_name,     // 표시명
  strategy,         // GRID | LINEAR | GRID_LINEAR | GRAPH
  tags,             // 알고리즘/자료구조 태그
  var_mapping,      // 변수 → 패널 매핑
  linear_pivots,    // 1D 배열 피벗 정보
  special_var_kinds // 변수 특수 역할 (HEAP, QUEUE 등)
}
```

### 3-3. `/api/explain` — 단계별 설명 (현재 미사용)

**현황:** 라우트 구현은 완료되어 있으나 `page.tsx` 에서 호출하지 않음.

**설계 사양:**

| 항목       | 내용                               |
| ---------- | ---------------------------------- |
| 전송 방식  | Server-Sent Events (SSE) 스트리밍  |
| 청크 크기  | 8 스텝 단위                        |
| 압축 방식  | 델타 압축 (변경된 변수만 전송)     |
| AI 실패 시 | 기본 템플릿 (`L.{line} 실행`) 폴백 |

### 3-4. 시각화 데이터 생성 주체

**알고리즘 시뮬레이션(BFS 등)의 실행 시나리오와 시각화 데이터는 AI가 아닌 실제 코드 실행 결과에서 도출된다.**

| 단계             | 주체                                   | 설명                                                     |
| ---------------- | -------------------------------------- | -------------------------------------------------------- |
| 알고리즘 실행    | **Web Worker** (Pyodide / JS)          | 사용자 코드를 실제로 실행하여 각 줄의 변수 상태 캡처     |
| 시각화 전략 결정 | **AI** (`/api/analyze`)                | 변수 타입과 코드 패턴을 보고 GRID/GRAPH/LINEAR 전략 선택 |
| 시각화 렌더링    | **클라이언트 엔진** (D3.js / Three.js) | 현재 스텝의 변수 상태를 즉시 렌더링                      |
| 단계 설명 주석   | **AI** (`/api/explain`)                | (현재 미사용) AI가 각 스텝에 자연어 설명 부착            |

> BFS의 큐 변화, 그래프 탐색 경로 등은 모두 실제 Python/JS 코드의 실행 트레이스에서 나온다.  
> AI는 "어떻게 보여줄 것인가"를 결정하는 메타데이터만 생성한다.

---

## 4. 최적화 제안

### 4-1. 캐시 영속성 확보 (현재: 세션 소멸)

**현황:** `analyzeCacheRef`는 `useRef`(in-memory)로 페이지 새로고침 시 소멸.

**제안:** `AnalyzeMetadata`를 `localStorage`에 직렬화하여 세션 간 재사용.

```typescript
// 캐시 키 해시화 (긴 키 방지)
const cacheKey = `prova_analyze_${await sha256(analyzeKey)}`;

// 저장
localStorage.setItem(
  cacheKey,
  JSON.stringify({ metadata, timestamp: Date.now() }),
);

// 조회 (TTL: 24h)
const cached = localStorage.getItem(cacheKey);
if (cached) {
  const { metadata, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < 86_400_000) return metadata;
}
```

**기대 효과:** 동일 알고리즘 재실행 시 AI 호출 완전 생략 → **토큰 0 소모**

---

### 4-2. `varTypes` 기반 캐시 키 정밀화

**현황:** `varTypes` 전체를 캐시 키에 포함 → 미세한 타입 변동에도 캐시 미스 발생.

**제안:** 캐시 키에 포함되는 `varTypes` 정보를 구조적 시그니처로 정규화.

```typescript
// 변수명 제거, 타입 구조만 추출 → 순서 정규화
function normalizeVarTypes(varTypes: Record<string, string>): string {
  return Object.values(varTypes).sort().join(",");
}

const analyzeKey = `${language}\n@@\n${code}\n@@\n${normalizeVarTypes(varTypes)}`;
```

**기대 효과:** 의미상 동일한 코드에 대한 불필요한 캐시 미스 감소

---

### 4-3. `/api/explain` 활성화 시 토큰 최적화

`/api/explain`을 향후 활성화할 경우, 토큰 소모를 최소화하는 전략:

#### (a) 델타 압축 고도화 (이미 일부 구현됨)

```typescript
// 현재: 변경된 변수만 전송
// 개선: 값이 동일한 스텝은 "no-change" 마커로 대체
type CompressedStep =
  | { type: "delta"; vars: Partial<VarMap> }
  | { type: "skip"; count: number }; // 연속된 동일 상태 압축
```

#### (b) 중요 스텝 선별 전송

```typescript
// AI에게 모든 스텝 대신 "변화가 있는 스텝"만 전송
const significantSteps = rawTrace.filter((step, i, arr) => {
  if (i === 0) return true;
  return JSON.stringify(step.vars) !== JSON.stringify(arr[i - 1].vars);
});
```

**기대 효과:** 불필요한 스텝(변수 변화 없는 단순 흐름 제어) 제거로 컨텍스트 토큰 30~60% 절감

#### (c) 청크 크기 동적 조정

```typescript
// 현재: 고정 8 스텝 청크
const CHUNK_SIZE = 8;

// 개선: 트레이스 길이에 따라 청크 크기 동적 조정
const CHUNK_SIZE = Math.min(16, Math.max(4, Math.floor(trace.length / 20)));
```

#### (d) 알고리즘별 설명 재사용

동일 알고리즘(`algorithm` 태그 일치)에서 반복되는 패턴 스텝(예: BFS 큐 삽입)은 템플릿 설명으로 대체하여 AI 호출 없이 처리.

---

### 4-4. 프롬프트 토큰 최적화 (`/api/analyze`)

**현황:** 분류 규칙 프롬프트가 60+ 줄, 매 호출마다 전체 전송.

**제안:**

1. **코드 길이 제한:** 트레이스에 사용된 변수와 관련 라인만 발췌하여 전송
2. **Gemini `systemInstruction` 분리:** 반복되는 분류 규칙을 `systemInstruction`으로 분리 (일부 프로바이더에서 캐시 가능)
3. **Few-shot 예시 축소:** 현재 포함된 JSON 예시를 schema 참조로 대체하여 입력 토큰 감소

---

### 4-5. 최적화 우선순위 요약

| 우선순위 | 제안                            | 예상 토큰 절감          | 구현 난이도 |
| -------- | ------------------------------- | ----------------------- | ----------- |
| 🔴 높음  | localStorage 캐시 영속화        | **100%** (캐시 히트 시) | 낮음        |
| 🔴 높음  | 중요 스텝만 선별해 explain 전송 | **30~60%**              | 중간        |
| 🟡 중간  | varTypes 시그니처 정규화        | 캐시 히트율 향상        | 낮음        |
| 🟡 중간  | 프롬프트 systemInstruction 분리 | **10~20%**              | 낮음        |
| 🟢 낮음  | 청크 크기 동적 조정             | **5~15%**               | 낮음        |
| 🟢 낮음  | 알고리즘별 설명 템플릿 재사용   | 가변                    | 높음        |
