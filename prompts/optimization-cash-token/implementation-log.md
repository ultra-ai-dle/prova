# 구현 로그: 에러 스텝 우선 explain + 파생 버그 수정

> 작성 기준일: 2026-04-11  
> 브랜치: `geunseon/optimization`  
> 관련 문서: `prompts/optimization-strategy.md`

---

## 개요

`optimization-strategy.md`의 **3-1. 에러 스텝 우선 적용** 구현 과정에서, `/api/explain` 연결 자체보다 그 전제 조건인 `/api/analyze`의 숨어있던 버그들이 연쇄적으로 발견됐다. 이 문서는 구현 흐름과 각 버그의 원인·해결을 기록한다.

---

## 1. 에러 스텝 우선 explain 구현

### 목표

에러가 발생한 실행 스텝에 AI 진단(`root_cause` + `fix_hint`)을 붙여서 Output 패널에 표시한다.  
전체 트레이스를 AI에 보내지 않고, **에러 스텝 ±3개 컨텍스트(최대 7스텝)만** 전송한다.

### 구현 내용

**`app/page.tsx`에 추가된 것 세 가지:**

**① `fetchErrorExplanation()` 함수**

```typescript
async function fetchErrorExplanation(
  steps: RawTraceStep[],
  algorithm: string,
  strategy: string
): Promise<AnnotatedStep[]> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawTrace: steps, algorithm, strategy }),
  });
  // SSE 스트림 파싱
  ...
}
```

**② 에러 발생 시 호출 로직** (`setMetadata()` 직후)

```typescript
if (errorStepIndex >= 0) {
  const contextStart = Math.max(0, errorStepIndex - 3);
  const contextEnd = Math.min(sanitizedRawTrace.length, errorStepIndex + 4);
  const errorContext = sanitizedRawTrace.slice(contextStart, contextEnd);

  fetchErrorExplanation(errorContext, meta.algorithm, meta.strategy)
    .then((annotated) => {
      const sparse = new Array<AnnotatedStep>(sanitizedRawTrace.length)
        .fill({ explanation: "", visual_actions: [], aiError: null });
      annotated.forEach((a, i) => { sparse[contextStart + i] = a; });
      setAnnotated(sparse);
    })
    .catch(() => {}); // AI 실패 시 원시 에러 메시지로 fallback
}
```

`setPyodideStatus("ready")` 이후 비동기로 실행되므로 UI 블로킹 없음.

**③ Output 패널 AI 진단 UI**

```tsx
{isError && currentStep?.aiError && (
  <div className="rounded-md border border-prova-red/30 bg-[#1a0a0d] ...">
    <p>AI 진단</p>
    <p>{currentStep.aiError.root_cause}</p>
    <p>수정 제안</p>
    <p>{currentStep.aiError.fix_hint}</p>
  </div>
)}
```

`currentStep.aiError`는 AI 응답이 도착하기 전엔 `null`이므로, 응답 전엔 렌더링되지 않음. 도착하면 `setAnnotated()` → `mergeTrace()` → 리렌더링 순서로 자동 표시.

### 검증

```javascript
// 테스트용 의도적 에러 코드
if(depth === M) return result.push(prob)
// result는 숫자(0)인데 .push() 호출 → TypeError: result.push is not a function
```

에러 발생 → Output 패널에 원시 에러 메시지 표시 → 잠시 후 "AI 진단" 블록 추가 표시 확인.

---

## 2. 파생 문제 ① — AI API 호출은 성공하나 폴백 결과만 반환

### 발견

에러 explain 구현 후 localStorage를 확인하니 모든 캐시 항목이:
```json
{ "algorithm": "Unknown", "display_name": "기본 분석", "summary": "AI 모델 오류로 패턴 인식만 수행했습니다." }
```

### 증상

터미널 로그:
```
[/api/analyze] parse failed raw preview: {"algorithm":"dfs","display_name":"Simple Path Probability on Grid","strategy":"GRID","tags":["dfs","back
[/api/analyze] fallback triggered: ANALYZE_PARSE_FAILED
```

AI가 응답을 보내고 있지만 JSON이 중간에 잘려 파싱 실패.

### 원인

`app/api/analyze/route.ts`의 `maxOutputTokens: 900`이 너무 낮았다.

`AnalyzeMetadata`의 전체 필드(`algorithm`, `display_name`, `strategy`, `tags`, `var_mapping`, `linear_pivots`, `special_var_kinds` 등)를 채우려면 복잡한 알고리즘 기준 1,200~1,800 토큰이 필요한데, 900으로 제한되어 JSON이 생성 도중 잘렸다.

### 해결

```typescript
// 변경 전
maxOutputTokens: 900

// 변경 후
maxOutputTokens: 2048
```

---

## 3. 파생 문제 ② — `var_mapping: {}` 항상 빈 객체

### 발견

`maxOutputTokens` 수정 후 JSON 파싱은 성공했지만, 저장된 캐시의 `var_mapping`이 여전히 `{}`:

```json
{
  "algorithm": "Breadth-First Search",
  "strategy": "GRID",
  "var_mapping": {}   ← 비어 있음
}
```

터미널에서도 파싱 실패 없이 200 응답이지만 시각화가 제대로 동작하지 않음.

### 원인: Gemini structured output의 필드 생성 순서

Gemini는 `responseSchema`에 정의된 **순서대로** 필드를 생성한다. 기존 스키마 순서:

```
algorithm → display_name → strategy → tags → detected_* → summary → ... → var_mapping
```

`summary`가 자유형 문자열이라 길게 생성되다가 토큰이 소진되면, Gemini는 뒤에 남은 `var_mapping`을 `{}`(빈 기본값)으로 처리하고 JSON을 닫는다. 결과적으로 파싱은 성공하지만 `var_mapping`이 비어 있는 유효한 JSON이 반환된다.

실제 증거 — `summary`가 잘린 채로 저장됨:
```
"summary": "Finds the shortest path from (0,0)... The distance to each reacha"
```

### 해결 1단계: 스키마 필드 순서 재배치

핵심 필드를 스키마 앞으로, `summary`를 뒤로 이동:

```typescript
const ANALYZE_GEMINI_SCHEMA = {
  properties: {
    algorithm, display_name, strategy,
    key_vars,       // 핵심 — 앞으로 이동
    var_mapping,    // 핵심 — 앞으로 이동
    tags, detected_data_structures, ...
    summary: { type: "string", maxLength: 120 }  // 마지막, 길이 제한 추가
  }
}
```

필드 순서 변경으로 `summary` 절삭 문제는 해결. 그러나 `var_mapping`은 여전히 `{}`.

---

## 4. 파생 문제 ③ — Gemini schema가 `additionalProperties` 미지원

### 원인 분석

`var_mapping: { type: "object" }`만 선언하면 Gemini는 내부 구조를 모르기 때문에 `{}`를 반환한다. 값의 구조를 알려주기 위해 `additionalProperties`를 추가했으나:

```
GEMINI_HTTP_400: Unknown name "additionalProperties" at 'generation_config.response_schema.properties[4].value': Cannot find field.
```

Gemini의 `responseSchema`는 OpenAPI 3.0의 서브셋으로, 표준 JSON Schema의 `additionalProperties`를 지원하지 않는다.

### 해결: 배열 우회 방식

`var_mapping` (객체 타입) → `var_mapping_list` (배열 타입)으로 스키마 변경.  
Gemini는 배열 아이템의 구조는 완벽히 지원하므로, 각 항목에 `role` 필드를 추가해 역할을 표현한다.

**스키마 변경:**
```typescript
var_mapping_list: {
  type: "array",
  items: {
    type: "object",
    properties: {
      role:     { type: "string" },
      var_name: { type: "string" },
      panel:    { type: "string", enum: ["GRID", "LINEAR", "GRAPH", "VARIABLES"] }
    },
    required: ["role", "var_name", "panel"]
  }
}
```

**`normalizeResponse()`에서 배열 → 객체 변환:**
```typescript
// 1순위: var_mapping_list (Gemini structured output)
if (Array.isArray(parsed.var_mapping_list)) {
  parsed.var_mapping_list.forEach((item) => {
    if (!varNames.includes(item.var_name)) return;
    validMap[item.role] = { var_name: item.var_name, panel };
  });
}

// 2순위: var_mapping 객체 (OpenAI/Groq 등 다른 프로바이더 폴백)
if (Object.keys(validMap).length === 0) {
  Object.entries(parsed.var_mapping ?? {}).forEach(([role, item]) => { ... });
}
```

두 포맷을 모두 처리해서 Gemini 외 프로바이더(OpenAI, Groq 등)도 기존 방식 그대로 동작.

---

## 5. 파생 문제 ④ — 오래된 폴백 결과가 캐시에 잔류

### 발견

버그를 수정하고 재실행해도 localStorage에 이전에 저장된 `Unknown` / `기본 분석` 결과가 캐시 히트되어 잘못된 설명서로 시각화.

### 원인

2계층 캐시 구조:
```
analyzeCacheRef (useRef, in-memory) → localStorage
```

- localStorage를 지워도 `useRef`는 페이지 새로고침 전까지 메모리에 유지됨
- 메모리 캐시가 1순위이므로 localStorage를 지워도 히트 발생

### 해결

폴백 결과가 저장된 localStorage 항목을 지운 후 **페이지 새로고침**까지 해야 `useRef` 메모리 캐시도 초기화됨.

---

## 버그 수정 전체 흐름 요약

```
에러 explain 구현
    │
    └─ 테스트 중 localStorage 확인
         │
         └─ 모든 캐시가 "Unknown / 기본 분석"
              │
              └─ 터미널 확인 → ANALYZE_PARSE_FAILED
                   │
                   └─ 원인: maxOutputTokens: 900 → 2048로 수정
                        │
                        └─ var_mapping: {} 여전히 비어 있음
                             │
                             └─ 원인: summary가 토큰 소모 → 스키마 필드 순서 재배치
                                  │
                                  └─ additionalProperties 사용 시도 → Gemini 400 에러
                                       │
                                       └─ 원인: Gemini schema 미지원
                                            │
                                            └─ var_mapping_list 배열 우회로 해결 ✅
```

---

## 최종 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `app/page.tsx` | `fetchErrorExplanation()` 추가, 에러 시 호출, Output 패널 AI 진단 UI |
| `app/api/analyze/route.ts` | `maxOutputTokens` 900→2048, 스키마 필드 순서 재배치, `var_mapping_list` 배열 방식 도입 |
| `src/lib/analyzeCache.ts` | localStorage LRU 캐시 신규 구현 (별도 이슈) |
