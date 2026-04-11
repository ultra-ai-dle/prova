# Prova 최적화 실행 전략

> 작성 기준일: 2026-04-11  
> 브랜치: `geunseon/optimization`  
> 선행 문서: `prompts/system-analysis.md`

---

## 문서 목적 및 배경

이 문서는 `system-analysis.md`의 **4-5. 최적화 우선순위 요약**을 실행 가능한 기술 설계로 구체화한다.

### explain 기능 미사용에 대한 기술적 배경

`/api/explain`은 라우트(`app/api/explain/route.ts`) 구현이 완전하나, `app/page.tsx` 및 프로젝트 전체 클라이언트 코드 어디에도 해당 엔드포인트를 호출하는 코드가 없다. `setAnnotated()` (Zustand 액션)와 `mergeTrace()` 파이프라인도 이미 완성되어 있어, 인프라는 100% 준비된 상태다.

미연결 이유는 코드에서 명시되지 않으나, 두 가지 가능성이 높다:

1. **비용 우선순위**: 트레이스 전체(최대 10,000 스텝)를 8 스텝씩 나눠 AI에 보내는 구조는 토큰 소모가 크다. `/api/analyze` 1회 호출만으로도 시각화가 가능하므로, 비용 대비 가치를 검증하기 전 연결을 보류한 것으로 보인다.
2. **UX 설계 미완**: `visual_actions` 열거값(`push`, `pop`, `visit`, `swap` 등)이 시각화 컴포넌트에 아직 연결되지 않았을 가능성. 즉, 받아봐야 쓸 곳이 없는 상태.

따라서 이 문서의 explain 관련 제안은 **"새 기능 추가"가 아닌 "이미 만들어진 기능의 안전한 활성화"** 관점에서 작성되었다.

---

## 목차

1. [localStorage LRU 캐시 — AnalyzeMetadata 영속화](#1-localstorage-lru-캐시--analyzemetadata-영속화)
2. [varTypes 시그니처 정규화 — 캐시 히트율 개선](#2-vartypes-시그니처-정규화--캐시-히트율-개선)
3. [explain 단계적 활성화 전략](#3-explain-단계적-활성화-전략)
   - 3-1. 에러 스텝 우선 적용
   - 3-2. 중요 스텝 선별 전송
4. [프롬프트 토큰 최적화 — /api/analyze](#4-프롬프트-토큰-최적화--apianalyze)
5. [청크 크기 동적 조정 — /api/explain](#5-청크-크기-동적-조정--apiexplain)

---

## 1. localStorage LRU 캐시 — AnalyzeMetadata 영속화

### 현재 구현 상태

```typescript
// app/page.tsx:400-401
const analyzeCacheRef = useRef<Map<string, AnalyzeMetadata>>(new Map());
const analyzeInFlightRef = useRef<Map<string, Promise<AnalyzeMetadata>>>(
  new Map(),
);
```

`useRef`(in-memory Map)로 구현되어 있어 **페이지 새로고침 시 캐시가 완전히 소멸**된다. 동일한 코드를 다시 실행하면 AI API를 다시 호출한다.

### Pain Point

- 사용자가 코드를 조금 수정하고 실행 → 원래 코드로 되돌리면 캐시 미스
- 페이지 새로고침 후 같은 코드 재실행 → 캐시 미스
- 학습 목적 사용자는 같은 알고리즘을 반복 실행하는 패턴이 많음

### 기술 설계

#### LRU 캐시 구현

`localStorage` 용량은 출처(origin)당 약 5MB. `AnalyzeMetadata` 객체 하나는 약 1~3KB이므로, **최대 200개** 항목 기준 약 400~600KB로 안전하게 운용 가능하다.

```typescript
// src/lib/analyzeCache.ts (신규 파일)

const STORAGE_PREFIX = "prova_analyze_v1_";
const MAX_ENTRIES = 200;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

interface CacheEntry {
  metadata: AnalyzeMetadata;
  timestamp: number;
  lruOrder: number; // 접근 시마다 갱신되는 단조 증가 카운터
}

// 단조 카운터 (세션 내 순서 추적용)
let lruCounter = Date.now();

/** 캐시 키를 SHA-256 해시로 단축 (긴 키로 인한 quota 낭비 방지) */
async function hashKey(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32); // 32자면 충분
}

function storageKey(hash: string): string {
  return `${STORAGE_PREFIX}${hash}`;
}

/** LRU 정책 실행: 초과 항목 중 가장 오래된 것을 제거 */
function evictIfNeeded(): void {
  const allKeys: Array<{ key: string; lruOrder: number }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const entry: CacheEntry = JSON.parse(localStorage.getItem(k)!);
      allKeys.push({ key: k, lruOrder: entry.lruOrder });
    } catch {
      localStorage.removeItem(k!);
    }
  }

  if (allKeys.length < MAX_ENTRIES) return;

  // lruOrder 오름차순 정렬 → 가장 오래 전에 접근한 항목 순
  allKeys.sort((a, b) => a.lruOrder - b.lruOrder);

  const toRemove = allKeys.slice(0, allKeys.length - MAX_ENTRIES + 1);
  for (const { key } of toRemove) {
    localStorage.removeItem(key);
  }
}

export async function getFromCache(
  rawKey: string,
): Promise<AnalyzeMetadata | null> {
  try {
    const hash = await hashKey(rawKey);
    const raw = localStorage.getItem(storageKey(hash));
    if (!raw) return null;

    const entry: CacheEntry = JSON.parse(raw);

    // TTL 만료 확인
    if (Date.now() - entry.timestamp > TTL_MS) {
      localStorage.removeItem(storageKey(hash));
      return null;
    }

    // LRU 순서 갱신
    entry.lruOrder = ++lruCounter;
    localStorage.setItem(storageKey(hash), JSON.stringify(entry));

    return entry.metadata;
  } catch {
    return null; // localStorage 접근 불가(시크릿 모드 등) → 무시
  }
}

export async function saveToCache(
  rawKey: string,
  metadata: AnalyzeMetadata,
): Promise<void> {
  try {
    evictIfNeeded();

    const hash = await hashKey(rawKey);
    const entry: CacheEntry = {
      metadata,
      timestamp: Date.now(),
      lruOrder: ++lruCounter,
    };
    localStorage.setItem(storageKey(hash), JSON.stringify(entry));
  } catch (e) {
    // QuotaExceededError: 공간 부족 시 강제 정리 후 재시도
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      clearHalfCache();
      try {
        const hash = await hashKey(rawKey);
        localStorage.setItem(
          storageKey(hash),
          JSON.stringify({
            metadata,
            timestamp: Date.now(),
            lruOrder: ++lruCounter,
          }),
        );
      } catch {
        /* 재시도도 실패 시 무시 */
      }
    }
  }
}

/** 용량 초과 시 가장 오래된 절반 제거 */
function clearHalfCache(): void {
  const allKeys: Array<{ key: string; lruOrder: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const entry: CacheEntry = JSON.parse(localStorage.getItem(k)!);
      allKeys.push({ key: k, lruOrder: entry.lruOrder });
    } catch {
      localStorage.removeItem(k!);
    }
  }
  allKeys.sort((a, b) => a.lruOrder - b.lruOrder);
  allKeys
    .slice(0, Math.ceil(allKeys.length / 2))
    .forEach(({ key }) => localStorage.removeItem(key));
}
```

#### page.tsx 연동

```typescript
// app/page.tsx — 캐시 조회/저장 교체

// 기존
const cachedMeta = analyzeCacheRef.current.get(analyzeKey);

// 변경 후
const cachedMeta =
  analyzeCacheRef.current.get(analyzeKey) ?? // 1. 메모리 캐시 (빠름)
  (await getFromCache(analyzeKey)); // 2. localStorage 캐시 (영속)

// 저장 시 (기존 analyzeCacheRef.current.set 호출 이후에 추가)
analyzeCacheRef.current.set(analyzeKey, meta);
await saveToCache(analyzeKey, meta); // 비동기, 결과 무시해도 됨
```

### 예상 기대 효과

| 시나리오                              | 변경 전  | 변경 후    |
| ------------------------------------- | -------- | ---------- |
| 새로고침 후 동일 코드 재실행          | API 호출 | **0 토큰** |
| 코드 수정 후 원복                     | API 호출 | **0 토큰** |
| 다음 날 같은 알고리즘 실행 (7일 이내) | API 호출 | **0 토큰** |

---

## 2. varTypes 시그니처 정규화 — ~~캐시 히트율 개선~~ (미채택)

### 초기 가설과 실제 동작의 차이

`varTypes`는 `extractVarTypesUnion`이 전체 트레이스를 순회하며 **등장한 모든 변수의 첫 번째 타입**을 기록한 맵이다. 함수 매개변수, 지역 변수, 루프 카운터 모두 포함되며, 실제 입력값(value)이 아닌 타입만 저장된다.

```
bfs(graph, 5) 실행 → varTypes = { "graph": "dict", "start": "int", "visited": "set", ... }
```

초기 제안은 "변수명을 바꿔도 타입 분포가 같으면 캐시 히트"를 목표로 했으나, 소스 코드를 분석하는 과정에서 전제 자체가 틀렸음이 드러났다.

### 왜 구현하지 않는가

**핵심 문제: 변수명을 바꾸면 코드 텍스트도 바뀐다.**

캐시 키는 `language + code + varTypes` 조합이다. 문서에서 예시로 든 두 버전을 실제로 대입하면:

```python
# 버전 A
def bfs(graph, start): visited = set(); queue = [start] ...

# 버전 B (변수명만 변경)
def bfs(adj, src): seen = set(); q = [src] ...
```

두 버전은 코드 텍스트 자체가 다르다. 따라서 `varTypes`를 정규화하기 전에 이미 **코드 컴포넌트에서 캐시 미스**가 발생한다. varTypes 정규화가 개입할 여지가 없는 것이다.

**정규화가 실제로 효과를 보는 경우는 매우 좁다:**

같은 코드를 서로 다른 `stdin` 입력값으로 실행했을 때, 분기 경로가 달라 일부 변수가 scope에 들어오거나 빠지는 경우뿐이다.

```python
if n > 10:
    x = [...]   # n=5이면 varTypes에 x 없음, n=15이면 있음
```

이 경우 코드는 동일하지만 varTypes가 달라 캐시 미스가 발생하고, 정규화하면 히트할 수 있다. 그러나 이 시나리오에서는 실행 경로가 실제로 다르기 때문에 **AI가 내놓는 분석 결과도 달라야 정상**이다. 즉, 정규화로 인한 캐시 히트가 오히려 **잘못된 메타데이터를 반환하는 false hit**이 될 수 있다.

### 결론

| 항목                                    | 평가                                                 |
| --------------------------------------- | ---------------------------------------------------- |
| 예상했던 주 효과 (변수명 리팩터링 대응) | 코드 텍스트 변경으로 이미 캐시 미스 → **효과 없음**  |
| 실제 효과가 있는 케이스 (분기 차이)     | AI 분석 결과가 달라야 하는 상황 → **false hit 위험** |
| 구현 복잡도 대비 순이익                 | **음수**                                             |

varTypes 정규화는 미채택한다. 현재 캐시 키 구조(`language + code + varTypes 전체`)가 의미상 올바르다.

---

## 3. explain 단계적 활성화 전략

전체 트레이스에 일괄 적용하는 대신, **효용이 가장 높은 구간에만 선별 적용**하는 2단계 전략을 제안한다.

### 3-1. 에러 스텝 우선 적용

#### 현재 구현 상태

에러 발생 시 `page.tsx`에서:

```typescript
// app/page.tsx:771-773
const errorStepIndex = sanitizedRawTrace.findIndex((step) => step.runtimeError);
setUiMode(errorStepIndex >= 0 ? "errorStep" : "visualizing");
setCurrentStep(errorStepIndex >= 0 ? errorStepIndex : 0);
```

`uiMode: "errorStep"`으로 전환되고, 해당 스텝의 `runtimeError: { type, message, line }` 정보를 UI에 표시하지만 **AI 진단 없이 원시 에러 메시지만 노출**된다.

반면 `/api/explain`의 `templateStep()`은 이미 에러 스텝 처리 로직을 갖추고 있다:

```typescript
// app/api/explain/route.ts:110-122
function templateStep(step: RawTraceStep): AnnotatedStep {
  if (step.runtimeError) {
    return {
      explanation: `L.${step.line} — 런타임 오류: ${step.runtimeError.type}`,
      visual_actions: ["markError", "pause"],
      aiError: {
        root_cause: step.runtimeError.message || step.runtimeError.type,
        fix_hint: "오류 메시지를 확인하고 코드를 수정하세요."  // AI 호출 시 실제 진단으로 교체
      }
    };
  }
  ...
}
```

#### 제안: 에러 스텝 단독 explain 호출

전체 트레이스를 보내는 대신, **에러 스텝 ±3개 컨텍스트만** 추출하여 AI에 전송한다.

```typescript
// app/page.tsx — setMetadata 이후 추가

if (errorStepIndex >= 0) {
  // 에러 전후 컨텍스트 스텝 (최대 7스텝)
  const contextStart = Math.max(0, errorStepIndex - 3);
  const contextEnd = Math.min(sanitizedRawTrace.length, errorStepIndex + 4);
  const errorContext = sanitizedRawTrace.slice(contextStart, contextEnd);

  // 비동기, UI를 블로킹하지 않음
  fetchErrorExplanation(errorContext, meta).then((annotated) => {
    // 에러 스텝에만 주석 반영
    const sparse = new Array<AnnotatedStep | null>(
      sanitizedRawTrace.length,
    ).fill(null);
    annotated.forEach((a, i) => {
      sparse[contextStart + i] = a;
    });
    setAnnotated(sparse.filter(Boolean) as AnnotatedStep[]);
  });
}
```

```typescript
// 에러 설명 전용 경량 호출
async function fetchErrorExplanation(
  steps: RawTraceStep[],
  meta: AnalyzeMetadata,
): Promise<AnnotatedStep[]> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rawTrace: steps,
      algorithm: meta.algorithm,
      strategy: meta.strategy,
    }),
  });
  // SSE 스트림 파싱
  const chunks: AnnotatedStep[] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const block of lines) {
      const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const parsed = JSON.parse(dataLine.slice(5));
      if (parsed.chunk) chunks.push(...parsed.chunk);
    }
  }
  return chunks;
}
```

#### 효용성

| 항목         | 전체 explain              | 에러 스텝 우선                            |
| ------------ | ------------------------- | ----------------------------------------- |
| 전송 스텝 수 | 전체 (최대 10,000)        | **최대 7개**                              |
| 토큰 소모    | 매우 높음                 | **극소**                                  |
| UX 가치      | 보통 (시각화가 이미 설명) | **높음** (에러 원인·해결책이 필요한 순간) |
| 구현 위험도  | 높음                      | **낮음** (기존 인프라 재사용)             |

---

### 3-2. 중요 스텝 선별 전송 — (미채택, 시기상조)

에러 스텝 우선 전략(3-1)은 이미 최대 7 스텝만 전송하므로 필터링이 필요 없다. 중요 스텝 선별은 "전체 트레이스를 explain에 보내는 경우"를 전제로 하는데, 전체 explain 활성화 자체가 아직 결정되지 않은 상태다.

현재 시점에서 이 최적화를 설계하는 것은 존재하지 않는 문제를 푸는 것과 같다. 전체 explain 도입을 결정하는 시점에 함께 설계한다.

---

## 4. 프롬프트 토큰 최적화 — /api/analyze (미채택)

### 검토 배경

`/api/analyze`는 매 호출마다 60+ 줄의 분류 규칙 프롬프트 전체를 전송한다. 코드가 100줄이라면 입력 토큰은 분류 규칙(~500토큰) + 코드(~200토큰) + varTypes(~100토큰) = **약 800토큰**.

두 가지 방향을 검토했으나, 둘 다 미채택한다.

### (a) systemInstruction 분리 — 미채택

Gemini API는 `systemInstruction`을 별도 필드로 분리할 수 있다. 일부 Gemini 버전에서 캐시되어 반복 호출 비용이 줄어든다는 아이디어였으나, 실제로는 효과가 없다.

**이유: `generateContent` 엔드포인트는 Context Caching을 지원하지 않는다.**

`systemInstruction` 캐싱은 Gemini 1.5 Pro의 **Context Caching API** 기능이며, 현재 `callGemini()`가 사용하는 기본 `generateContent` 엔드포인트에는 자동 캐싱이 없다. systemInstruction을 분리해도 매 호출마다 프롬프트 규칙 전체가 그대로 토큰으로 청구된다.

또한 `callWithFallback` 인터페이스는 단일 `prompt: string`을 받는다. systemInstruction 분리는 이를 `{ system: string, user: string }` 형태로 바꾸거나 Gemini 전용 코드 경로를 추가해야 하는데, OpenAI/Groq/Anthropic도 각자의 방식으로 system role을 처리하게 된다. **리팩터링 비용만 발생하고 실질 절감은 없다.**

### (b) 실행 라인 기반 코드 필터링 — 미채택

트레이스에서 실제로 실행된 라인 번호만 추출해 코드를 필터링하여 전송하는 아이디어였다. 코드 토큰 20~40% 절감이 예상됐으나, 세 가지 구조적 문제로 미채택한다.

**문제 1: post-processing 함수들이 전체 코드에 의존한다 (치명적)**

`enrichSpecialVarKinds()`, `detectDequeVars()`, `detectArrayVars()`, `detectDirectionMapVars()`, `applyGraphModeInference()` 모두 원본 `code`를 받아 regex로 패턴을 스캔한다. 이 함수들은 AI 응답과 무관하게 전체 코드를 본다. 즉, AI에게 필터링된 코드를 보내도 post-processing은 여전히 원본 코드로 동작한다. 결과적으로 **AI 응답 품질만 저하**되고, AI가 잘못 판단한 strategy나 var_mapping을 post-processing이 보정하지 못하는 상황이 발생한다.

**문제 2: 미실행 분기가 알고리즘 분류에 필수인 경우가 있다**

```python
def solve():
    if condition:
        dfs(start, set())   # 이 실행에서 trace에 있음
    else:
        bfs(start)          # trace에 없음 → AI는 BFS 존재를 모름
```

실행된 분기만 보내면 AI는 BFS/DFS 중 하나만 존재한다고 판단한다. `strategy`, `tags`, `detected_algorithms`가 모두 부정확해진다.

**문제 3: 함수 정의 줄이 trace에 없는 경우가 많다**

Python/JavaScript tracer는 함수 **호출** 시점은 기록하지만 `def`/`function` **선언 줄** 자체는 실행 라인으로 기록하지 않는 경우가 많다. 필터링하면 AI가 함수명과 시그니처를 보지 못해 알고리즘 분류 정확도가 떨어진다.

### 현재 상태로 충분한 이유

`compactCodeForAnalyze()` (3200자 상한, head/tail 방식)가 이미 코드 토큰 상한을 처리하고 있고, localStorage LRU 캐시(섹션 1)로 반복 호출 자체가 대폭 줄었다. 추가 최적화의 실질적 기대 이득이 없다.

### 결론

| 제안                       | 실제 토큰 절감         | 분석 품질 위험                                      | 구현 비용 | 결정       |
| -------------------------- | ---------------------- | --------------------------------------------------- | --------- | ---------- |
| (a) systemInstruction 분리 | **없음** (캐싱 미지원) | 없음                                                | 중간      | **미채택** |
| (b) 실행 라인 필터링       | 20~40%                 | **높음** (post-processing 의존성, 미실행 분기 누락) | 낮음      | **미채택** |

---

## 5. 청크 크기 동적 조정 — (미채택, 시기상조)

`/api/explain`의 고정 `CHUNK_SIZE = 8`을 트레이스 길이에 따라 동적으로 조정하는 아이디어였으나, 3-2와 같은 이유로 미채택한다. 에러 스텝 전략에서는 전송 스텝이 최대 7개이므로 청크 크기 자체가 의미 없고, 전체 explain 활성화를 결정하는 시점에 함께 검토한다.

---

## 종합 로드맵

```
Phase 1 (낮은 위험, 높은 즉시 효과)
├── localStorage LRU 캐시                  → 재방문 시 AI 비용 제로 ✅ 구현 완료
└── /api/explain 에러 스텝 우선 활성화    → 최소 토큰으로 최대 UX 가치

Phase 2 (전체 explain 활성화 결정 시 함께 검토)
├── 중요 스텝 선별 전송                   → 전체 explain 토큰 절감 (현재 미채택)
└── 청크 크기 동적 조정                   → explain API 호출 횟수 절감 (현재 미채택)

Phase 3 (미채택)
├── Gemini systemInstruction 분리          → generateContent 캐싱 미지원, 실효 없음
└── 실행 라인 기반 코드 필터링             → post-processing 의존성·미실행 분기 문제
```
