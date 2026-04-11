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
const analyzeInFlightRef = useRef<Map<string, Promise<AnalyzeMetadata>>>(new Map());
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
  lruOrder: number;   // 접근 시마다 갱신되는 단조 증가 카운터
}

// 단조 카운터 (세션 내 순서 추적용)
let lruCounter = Date.now();

/** 캐시 키를 SHA-256 해시로 단축 (긴 키로 인한 quota 낭비 방지) */
async function hashKey(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw)
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
  rawKey: string
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
  metadata: AnalyzeMetadata
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
          JSON.stringify({ metadata, timestamp: Date.now(), lruOrder: ++lruCounter })
        );
      } catch { /* 재시도도 실패 시 무시 */ }
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
  allKeys.slice(0, Math.ceil(allKeys.length / 2)).forEach(({ key }) =>
    localStorage.removeItem(key)
  );
}
```

#### page.tsx 연동

```typescript
// app/page.tsx — 캐시 조회/저장 교체

// 기존
const cachedMeta = analyzeCacheRef.current.get(analyzeKey);

// 변경 후
const cachedMeta =
  analyzeCacheRef.current.get(analyzeKey) ??   // 1. 메모리 캐시 (빠름)
  (await getFromCache(analyzeKey));             // 2. localStorage 캐시 (영속)

// 저장 시 (기존 analyzeCacheRef.current.set 호출 이후에 추가)
analyzeCacheRef.current.set(analyzeKey, meta);
await saveToCache(analyzeKey, meta);           // 비동기, 결과 무시해도 됨
```

### 예상 기대 효과

| 시나리오 | 변경 전 | 변경 후 |
|---------|---------|---------|
| 새로고침 후 동일 코드 재실행 | API 호출 | **0 토큰** |
| 코드 수정 후 원복 | API 호출 | **0 토큰** |
| 다음 날 같은 알고리즘 실행 (7일 이내) | API 호출 | **0 토큰** |

---

## 2. varTypes 시그니처 정규화 — 캐시 히트율 개선

### 현재 구현 상태

```typescript
// app/page.tsx:366-370
function stableStringifyObject(obj: Record<string, string>) {
  return JSON.stringify(
    Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
  );
}

// 캐시 키: language + code + 전체 varTypes JSON
const analyzeKey =
  `${analyzeLanguage}\n@@\n${codeRef.current}\n@@\n${stableStringifyObject(sanitizedVarTypes)}\n@@\nmeta-v2-partition-pivot`;
```

`varTypes`는 변수명과 타입의 매핑이다 (예: `{ "graph": "dict", "visited": "set", "i": "int" }`). **변수명이 포함되기 때문에, 사용자가 변수명만 바꿔도 캐시 미스가 발생한다.**

### Pain Point

동일 알고리즘의 의미상 동일한 두 코드:

```python
# 버전 A
def bfs(graph, start): visited = set(); queue = [start] ...

# 버전 B (변수명만 변경)
def bfs(adj, src): seen = set(); q = [src] ...
```

두 버전은 `varTypes` 값의 타입 집합은 동일하지만(`dict, set, list, int`) 키(변수명)가 달라 캐시 미스. `/api/analyze`가 두 번 호출된다.

### 기술 설계

`varTypes`의 **타입 값만 추출해 정렬한 시그니처**를 캐시 키로 사용한다. 단, 타입 분포가 같은 전혀 다른 알고리즘이 충돌하는 경우를 방지하기 위해 **코드 자체는 키에 그대로 유지**한다.

```typescript
/**
 * varTypes에서 변수명을 제거하고 타입 집합만 추출.
 * { "graph": "dict", "visited": "set", "i": "int" }
 *   → "dict,int,set"  (정렬 후 join)
 */
function varTypeSignature(varTypes: Record<string, string>): string {
  return Object.values(varTypes).sort().join(",");
}

const analyzeKey =
  `${analyzeLanguage}\n@@\n${codeRef.current}\n@@\n${varTypeSignature(sanitizedVarTypes)}\n@@\nmeta-v2-partition-pivot`;
```

> **주의**: AI 응답에서 `var_mapping`(변수명 → 패널 매핑)은 코드 분석으로 도출되므로 변수명 정보가 AI에게 전달되지 않는 것과 무관하다. 캐시 키만 정규화하는 것이며, `/api/analyze` 호출 시 전달하는 `varTypes`는 기존 그대로 유지한다.

### 예상 기대 효과

- 변수명을 리팩터링한 코드 재실행 시 캐시 히트율 향상
- 동일 알고리즘 패턴의 반복 학습 케이스에서 불필요한 API 호출 감소

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
    const sparse = new Array<AnnotatedStep | null>(sanitizedRawTrace.length).fill(null);
    annotated.forEach((a, i) => { sparse[contextStart + i] = a; });
    setAnnotated(sparse.filter(Boolean) as AnnotatedStep[]);
  });
}
```

```typescript
// 에러 설명 전용 경량 호출
async function fetchErrorExplanation(
  steps: RawTraceStep[],
  meta: AnalyzeMetadata
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

| 항목 | 전체 explain | 에러 스텝 우선 |
|------|-------------|---------------|
| 전송 스텝 수 | 전체 (최대 10,000) | **최대 7개** |
| 토큰 소모 | 매우 높음 | **극소** |
| UX 가치 | 보통 (시각화가 이미 설명) | **높음** (에러 원인·해결책이 필요한 순간) |
| 구현 위험도 | 높음 | **낮음** (기존 인프라 재사용) |

---

### 3-2. 중요 스텝 선별 전송

전체 explain을 활성화하는 경우, 모든 스텝을 AI에 보내는 것은 비효율적이다. 알고리즘 실행의 대부분은 루프 카운터 증가, 내부 변수 초기화 등 **알고리즘 이해에 무의미한 스텝**이다.

#### 중요 스텝 판별 알고리즘

다음 우선순위로 스텝을 분류한다:

```typescript
// src/lib/significantSteps.ts (신규)

import { RawTraceStep, BranchLines, AnalyzeMetadata } from "@/types/prova";

export interface SignificantStep {
  step: RawTraceStep;
  originalIndex: number;
  reason: "error" | "key_var_changed" | "structure_mutated" | "branch_boundary" | "first_last";
}

/**
 * 전체 트레이스에서 AI 설명이 의미있는 스텝만 선별한다.
 *
 * 판별 기준 (우선순위 순):
 *  1. runtimeError — 에러 스텝은 항상 포함
 *  2. key_vars 변화 — AI가 핵심으로 판단한 변수의 값 변화
 *  3. 자료구조 변이 — 컬렉션(list/set/dict)의 length 변화
 *  4. 분기/루프 경계 — branchLines 교차 시점
 *  5. 첫/마지막 스텝 — 진입·종료 컨텍스트
 */
export function selectSignificantSteps(
  trace: RawTraceStep[],
  branchLines: BranchLines,
  metadata: AnalyzeMetadata,
  maxSteps = 80   // AI에게 보낼 최대 스텝 수
): SignificantStep[] {
  if (trace.length === 0) return [];

  const branchSet = new Set([...branchLines.loop, ...branchLines.branch]);
  const keyVars = new Set(metadata.key_vars ?? []);

  const scored: Array<{ step: RawTraceStep; idx: number; score: number; reason: SignificantStep["reason"] }> = [];

  for (let i = 0; i < trace.length; i++) {
    const curr = trace[i];
    const prev = i > 0 ? trace[i - 1] : null;

    // 1. 에러 스텝 (최고 우선순위)
    if (curr.runtimeError) {
      scored.push({ step: curr, idx: i, score: 100, reason: "error" });
      continue;
    }

    // 2. 핵심 변수 값 변화
    if (prev && keyVars.size > 0) {
      const keyVarChanged = [...keyVars].some(
        (v) => JSON.stringify(curr.vars[v]) !== JSON.stringify(prev.vars[v])
      );
      if (keyVarChanged) {
        scored.push({ step: curr, idx: i, score: 70, reason: "key_var_changed" });
        continue;
      }
    }

    // 3. 컬렉션 크기(구조) 변이 감지
    if (prev) {
      const mutated = Object.keys(curr.vars).some((k) => {
        const cv = curr.vars[k];
        const pv = prev.vars[k];
        if (Array.isArray(cv) && Array.isArray(pv)) return cv.length !== pv.length;
        if (cv && typeof cv === "object" && "length" in cv) return (cv as {length: number}).length !== (pv as {length: number})?.length;
        return false;
      });
      if (mutated) {
        scored.push({ step: curr, idx: i, score: 50, reason: "structure_mutated" });
        continue;
      }
    }

    // 4. 분기/루프 경계
    if (branchSet.has(curr.line)) {
      scored.push({ step: curr, idx: i, score: 30, reason: "branch_boundary" });
      continue;
    }
  }

  // 5. 첫/마지막 스텝 항상 포함
  const firstIdx = 0;
  const lastIdx = trace.length - 1;
  if (!scored.find((s) => s.idx === firstIdx))
    scored.unshift({ step: trace[0], idx: 0, score: 20, reason: "first_last" });
  if (!scored.find((s) => s.idx === lastIdx))
    scored.push({ step: trace[lastIdx], idx: lastIdx, score: 20, reason: "first_last" });

  // 점수 내림차순 정렬 후 maxSteps 제한, 결과는 원본 순서로 재정렬
  const top = scored
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, maxSteps)
    .sort((a, b) => a.idx - b.idx);

  return top.map(({ step, idx, reason }) => ({
    step,
    originalIndex: idx,
    reason,
  }));
}
```

#### explain 호출 시 연동

```typescript
// /api/explain 호출 전 필터링
const significant = selectSignificantSteps(
  sanitizedRawTrace,
  branchLines,
  meta,
  80  // 토큰 예산에 따라 조정
);

// 선별된 스텝만 전송
const res = await fetch("/api/explain", {
  body: JSON.stringify({
    rawTrace: significant.map((s) => s.step),
    algorithm: meta.algorithm,
    strategy: meta.strategy,
  }),
});

// AI 응답을 원본 인덱스에 매핑
const sparse = new Array<AnnotatedStep | null>(sanitizedRawTrace.length).fill(null);
annotatedChunks.forEach((a, i) => {
  sparse[significant[i].originalIndex] = a;
});
setAnnotated(sparse.filter(Boolean) as AnnotatedStep[]);
```

#### 필터링 효과 추정

| 알고리즘 | 총 스텝 | 선별 후 예상 스텝 | 절감률 |
|---------|---------|-----------------|-------|
| BFS (그래프 100노드) | ~800 | ~60 | **92%** |
| 버블 정렬 (n=50) | ~2,500 | ~70 | **97%** |
| DP (피보나치 n=30) | ~120 | ~35 | **71%** |

---

## 4. 프롬프트 토큰 최적화 — /api/analyze

### 현재 구현 상태

`/api/analyze`는 매 호출마다 60+ 줄의 분류 규칙 프롬프트 전체를 전송한다. 코드가 100줄이라면 입력 토큰은 분류 규칙(~500토큰) + 코드(~200토큰) + varTypes(~100토큰) = **약 800토큰**.

### 기술 설계

#### (a) systemInstruction 분리 (Gemini 한정, 즉시 적용 가능)

Gemini API는 `systemInstruction`을 별도 필드로 분리할 수 있다. 일부 Gemini 버전에서 `systemInstruction`은 캐시되어 재사용되므로 반복 호출 비용이 줄어든다.

```typescript
// app/api/analyze/route.ts — callGemini 호출 시

body: JSON.stringify({
  system_instruction: {   // 분류 규칙 (고정 부분)
    parts: [{ text: CLASSIFICATION_RULES_PROMPT }]
  },
  contents: [{            // 변하는 부분만 user turn에
    role: "user",
    parts: [{ text: buildUserPrompt(code, varTypes, language) }]
  }],
  ...
})
```

#### (b) 코드 길이 상한 적용

트레이스에서 실제로 실행된 라인만 추출하여 전송한다:

```typescript
function extractExecutedLines(code: string, trace: RawTraceStep[]): string {
  const executedLineNos = new Set(trace.map((s) => s.line));
  return code
    .split("\n")
    .map((line, i) => (executedLineNos.has(i + 1) ? line : null))
    .filter(Boolean)
    .join("\n");
}
```

실행되지 않은 주석, 미사용 함수 등을 제외하면 코드 토큰이 20~40% 절감된다.

### 예상 기대 효과

- Gemini systemInstruction 분리: 반복 호출 시 ~30% 입력 토큰 절감 (캐시 지원 시)
- 실행 라인 필터링: 코드 부분 ~20~40% 절감

---

## 5. 청크 크기 동적 조정 — /api/explain

### 현재 구현 상태

```typescript
// app/api/explain/route.ts:7
const CHUNK_SIZE = 8;
```

트레이스 길이와 무관하게 고정 8 스텝씩 청크 처리.

### 기술 설계

트레이스 총 길이에 비례해 청크 크기를 조정, AI 호출 횟수를 줄인다:

```typescript
// app/api/explain/route.ts

function adaptiveChunkSize(totalSteps: number): number {
  if (totalSteps <= 20)  return 4;   // 짧은 트레이스: 세밀하게
  if (totalSteps <= 100) return 8;   // 현재 기본값
  if (totalSteps <= 500) return 16;  // 중간 규모
  return 24;                         // 장대한 트레이스: 묶어서 처리
}

// Route handler 내부
const CHUNK_SIZE = adaptiveChunkSize(steps.length);
```

### 예상 기대 효과

| 트레이스 길이 | 기존 API 호출 수 | 개선 후 API 호출 수 | 절감률 |
|-------------|----------------|------------------|-------|
| 500 스텝 | 63회 | 32회 (16 청크) | **49%** |
| 1,000 스텝 | 125회 | 42회 (24 청크) | **66%** |

---

## 종합 로드맵

```
Phase 1 (낮은 위험, 높은 즉시 효과)
├── localStorage LRU 캐시                  → 재방문 시 AI 비용 제로
├── varTypes 시그니처 정규화               → 캐시 히트율 향상
└── /api/explain 에러 스텝 우선 활성화    → 최소 토큰으로 최대 UX 가치

Phase 2 (중간 복잡도)
├── 중요 스텝 선별 전송 (significantSteps) → 전체 explain 토큰 70~97% 절감
└── 청크 크기 동적 조정                   → explain API 호출 횟수 50~66% 절감

Phase 3 (아키텍처 변경 수반)
├── Gemini systemInstruction 분리          → analyze 반복 호출 비용 절감
└── 실행 라인 기반 코드 필터링             → 입력 토큰 20~40% 절감
```
