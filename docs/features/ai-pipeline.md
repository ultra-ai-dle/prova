# AI Pipeline

## 한줄 요약
2-Phase AI 호출: analyze(전략·변수 매핑)→ explain(스텝별 설명·visual_actions) SSE 스트리밍.

## 데이터 흐름

```mermaid
flowchart LR
    subgraph Phase1["Phase 1 — /api/analyze (1회)"]
        A_IN["code + varTypes"] --> A_OUT["AnalyzeMetadata\n{algorithm, strategy,\nvar_mapping, ...}"]
    end

    subgraph Phase2["Phase 2 — /api/explain (SSE)"]
        E_IN["rawTrace + algorithm\n+ strategy"] --> E_OUT["AnnotatedStep[]\n(8 step/chunk)"]
    end

    Phase1 --> Phase2
```

## 모듈 경계

| 엔드포인트 | 입력 | 출력 | 파일 |
|---|---|---|---|
| `/api/analyze` | `{code, varTypes, language?}` | `AnalyzeMetadata` (JSON) | app/api/analyze/route.ts |
| `/api/explain` | `{rawTrace, algorithm, strategy}` | SSE stream: `{index, chunk}` | app/api/explain/route.ts |

### analyze 서브모듈 (`app/api/analyze/_lib/`)

| 파일 | 역할 |
|---|---|
| `prompt.ts` | 상수(`ANALYZE_CODE_CHAR_LIMIT`, `ANALYZE_GEMINI_SCHEMA`), `compactCodeForAnalyze`, `compactVarTypes` |
| `normalize.ts` | `normalizeResponse` (AI 응답 → `AnalyzeMetadata`), `fallbackAnalyzeMetadata`, `parseLinearPivots` |
| `enrichment.ts` | 코드 패턴 보강 6개 (`applyDequeHints`, `enrichSpecialVarKinds` 등) + detect 헬퍼 |
| `partitionPivotEnrichment.ts` | 퀵소트 피벗 감지 → `pivot_mode: value_in_array` 보강 |
| `index.ts` | barrel re-export |

## AI 프로바이더 체인

```mermaid
flowchart TD
    Build["buildChain()\nenv: AI_PROVIDER/AI_MODEL\nFALLBACK_PROVIDER/FALLBACK_MODEL"]
    --> Chain["[메인, 폴백]"]

    Chain --> Call["callWithFallback(prompt, chain)"]
    Call -->|성공| OK["결과 반환"]
    Call -->|토큰 초과 · 일시 에러| Retry["다음 프로바이더로 재시도"]
    Call -->|인증 에러| Abort["즉시 중단"]
```

**지원 프로바이더**: gemini, openai, groq, anthropic, openrouter
**파일**: `src/lib/ai-providers.ts`

## Analyze 후처리 (코드 패턴 보강)

AI 응답 후 정규식 기반으로 추가 보강 (`_lib/enrichment.ts`):
- `enrichSpecialVarKinds()` — heapq, deque, path compression, distance init, visited, stack 패턴 감지
- `enrichLinearPivots()` — two-pointer 패턴 감지
- `applyDequeHints()` — Python deque → QUEUE/STACK/DEQUE 분류
- `applyJsArrayHints()` — JS push/pop/shift/unshift → STACK/QUEUE 분류
- `applyDirectionMapGuards()` — 방향 벡터 맵 var_mapping 제거
- `applyGraphModeInference()` — graph_mode 미지정 시 코드 패턴으로 추론
- `enrichAnalyzeMetadataWithPartitionValuePivots()` — 퀵소트 피벗 감지 (`_lib/partitionPivotEnrichment.ts`)

## Explain 청크 전략

- **청크 크기**: 8 step
- **Delta 압축**: 첫 step만 전체 vars, 나머지는 변경된 값만 전송
- **SSE 이벤트**: `event: chunk` → `{index: number, chunk: AnnotatedStep[]}`, `event: done` → `{}`
- **폴백**: AI 전체 실패 시 template 설명 생성 (라인 번호 + 에러 마커만)

## 핵심 계약 조건

- `var_mapping[].var_name` ∈ `varTypes` 키 (실제 변수명만)
- `strategy` ∈ `"GRID" | "LINEAR" | "GRID_LINEAR" | "GRAPH"`
- explain 출력 배열 길이 === 입력 steps 길이 (1:1 대응)
- 에러 분석 키는 `aiError` 고정 (`runtimeError`와 구분)
- `visual_actions`에 색상/스타일 포함 금지
