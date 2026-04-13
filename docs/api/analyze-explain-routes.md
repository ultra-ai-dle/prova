# `/api/analyze` · `/api/explain` API 요약

이 문서는 **레포 안의 TypeScript 구현**만을 근거로 한다. (`app/api/analyze/route.ts`, `app/api/explain/route.ts`, `src/types/prova.ts` 등.)

---

## `POST /api/analyze`

### 역할

실행기(워커·Java)가 수집한 **`varTypes`** 와 사용자 **`code`** 를 받아, AI(`analyzeWithAi` → `callWithFallback`)로 **알고리즘·시각화 전략·변수 패널 매핑** 등을 담은 **`AnalyzeMetadata`** 를 돌려준다. 응답은 `normalizeResponse` 및 여러 `enrich*` 후처리를 거친다.

### 요청

- **Content-Type:** `application/json`
- **본문 필드** (`app/api/analyze/route.ts` 의 `POST` 핸들러가 읽는 값):

| 필드 | 타입 | 설명 |
|------|------|------|
| `code` | string | 필수에 가깝게 취급 — 공백만이면 **400** |
| `varTypes` | `Record<string, string>` | 기본 `{}` |
| `language` | string | 기본 `"python"` |

**요청 예시:**

```json
{
  "code": "def f():\n    x = [1, 2, 3]\n    return sum(x)\n",
  "varTypes": {
    "x": "list",
    "f": "function"
  },
  "language": "python"
}
```

### 응답

#### 정상 (HTTP 200)

`NextResponse.json(metadata)` — 본문 타입은 **`AnalyzeMetadata`** (`src/types/prova.ts`).

`var_mapping_list`(AI 원본)는 **`var_mapping`** 객체로 정규화된다. `key_vars`, `linear_pivots` 등은 `varTypes` 키에 없는 이름이면 제거된다.

**응답 예시 (구조만; 값은 AI·후처리에 따라 달라짐):**

```json
{
  "algorithm": "array-sum",
  "display_name": "배열 합",
  "strategy": "LINEAR",
  "tags": ["array", "aggregation"],
  "detected_data_structures": ["list"],
  "detected_algorithms": ["iteration"],
  "summary": "리스트 요소를 순회하며 합을 구한다.",
  "graph_mode": "directed",
  "graph_var_name": "",
  "graph_representation": "MAP",
  "uses_bitmasking": false,
  "time_complexity": "O(n)",
  "key_vars": ["x"],
  "var_mapping": {
    "primary_array": { "var_name": "x", "panel": "LINEAR" }
  },
  "linear_pivots": [
    { "var_name": "i", "badge": "i", "indexes_1d_var": "x", "pivot_mode": "index" }
  ],
  "linear_context_var_names": [],
  "special_var_kinds": {}
}
```

#### 코드 누락 (HTTP 400)

`code` 가 비어 있으면:

```json
{ "message": "code is required" }
```

#### AI 단계 예외 (HTTP 200)

`try` 블록 안에서 예외가 나면 **`fallbackAnalyzeMetadata(varTypes, code, language)`** 를 **항상 200** 으로 반환한다 (`app/api/analyze/route.ts` 의 `catch`).

폴백의 한 형태 예 (필드는 `fallbackAnalyzeMetadata` 구현에 따름):

```json
{
  "algorithm": "Unknown",
  "display_name": "기본 분석",
  "strategy": "LINEAR",
  "tags": ["기본-분석"],
  "summary": "AI 과부하로 기본 분석 결과를 표시합니다.",
  "uses_bitmasking": false,
  "key_vars": ["x"],
  "var_mapping": {
    "PRIMARY": { "var_name": "x", "panel": "LINEAR" }
  }
}
```

### 클라이언트 호출

`src/hooks/useProvaExecution.ts` 에서 실행 완료 후 `fetch("/api/analyze", { method: "POST", ... })` 로 호출한다.

---

## `POST /api/explain`

### 역할

**`rawTrace`** 를 **8스텝 단위**(`CHUNK_SIZE`, `app/api/explain/route.ts`)로 나누어, 각 배치마다 AI(`annotateBatch` → `callWithFallback`)에 **스텝별 설명·`visual_actions`** 를 요청한다. 결과는 **Server-Sent Events(SSE)** 로 스트리밍한다.

### 요청

- **Content-Type:** `application/json`
- **본문 필드:**

| 필드 | 타입 | 기본값 |
|------|------|--------|
| `rawTrace` | `RawTraceStep[]` | `[]` |
| `algorithm` | string | `"Unknown"` |
| `strategy` | string | `"LINEAR"` |

처리 전 각 스텝에서 **`parent_frames`** 는 제거된다 (토큰 절약).

**`RawTraceStep` 필드** (`src/types/prova.ts`): `step`, `line`, `vars`, `scope`, `parent_frames`(입력 시 제거됨), `stdout?`, `runtimeError`, `event?`, `returnValue?` 등.

**요청 예시:**

```json
{
  "rawTrace": [
    {
      "step": 0,
      "line": 2,
      "vars": { "nums": [1, 2, 3], "i": 0 },
      "scope": { "func": "main", "depth": 0 },
      "parent_frames": [],
      "runtimeError": null
    },
    {
      "step": 1,
      "line": 3,
      "vars": { "nums": [1, 2, 3], "i": 1 },
      "scope": { "func": "main", "depth": 0 },
      "parent_frames": [],
      "runtimeError": null
    }
  ],
  "algorithm": "linear-scan",
  "strategy": "LINEAR"
}
```

JSON 파싱 실패 시 **400**, 본문 `"Bad request"` (plain text).

### 응답

- **Content-Type:** `text/event-stream`
- **헤더:** `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no` (`app/api/explain/route.ts`)

각 이벤트는 `sseEvent` 로 인코딩된다:

```text
event: <이벤트명>\ndata: <JSON 한 줄>\n\n
```

#### `event: chunk`

`data` 페이로드 형식: `{ "index": number, "chunk": AnnotatedStep[] }`

- **`index`:** 해당 배치가 원본 `rawTrace`에서 시작하는 인덱스 (0, 8, 16, …).
- **`chunk`:** 길이는 해당 배치의 스텝 수(마지막 배치는 8 이하).  
  각 원소는 **`AnnotatedStep`** (`src/types/prova.ts`):

| 필드 | 타입 |
|------|------|
| `explanation` | string |
| `visual_actions` | string[] |
| `aiError` | `{ root_cause, fix_hint } \| null` |

`buildPrompt` 에서 허용하는 `visual_actions` 문자열 예:  
`highlight`, `updateLinear`, `focusGrid`, `updateGraph`, `push`, `pop`, `visit`, `compare`, `swap`, `markError`, `pause` (`app/api/explain/route.ts`).

**응답 예시 (SSE 텍스트):**

```text
event: chunk
data: {"index":0,"chunk":[{"explanation":"초기 상태에서 i가 0이다.","visual_actions":["highlight"],"aiError":null},{"explanation":"i를 1로 갱신한다.","visual_actions":["highlight"],"aiError":null}]}

event: done
data: {}
```

#### `event: done`

스트림 정상 종료 시 `data: {}`.

#### `event: error`

스트림 처리 중 예외 시 `data: { "message": "설명 생성 실패" }` 형태.

### 클라이언트 호출

`app`·`src` 기준 **`fetch("/api/explain"` 호출은 없음** — 라우트만 존재하고 UI는 연결되어 있지 않다.

---

## 구현 파일 (참고)

| 내용 | 파일 |
|------|------|
| Analyze 핸들러 | `app/api/analyze/route.ts` |
| Analyze 정규화·폴백 | `app/api/analyze/_lib/normalize.ts` |
| Gemini 스키마 상수 | `app/api/analyze/_lib/prompt.ts` (`ANALYZE_GEMINI_SCHEMA`) |
| Explain 핸들러·SSE | `app/api/explain/route.ts` |
| 공통 타입 | `src/types/prova.ts` (`AnalyzeMetadata`, `RawTraceStep`, `AnnotatedStep`) |
| 클라이언트에서 analyze 호출 | `src/hooks/useProvaExecution.ts` |

---

## 잘못 작성된 마크다운 · `/api/explain` 오기재 파일 목록

판별 기준(코드 기준, 저장소 스냅샷 시점): `app/`·`src/` 에서 **`fetch("/api/explain"` 호출이 없음** → 문서가 **기본 실행 경로에 explain(Phase 2)가 포함된다**고 적혀 있으면 **오기재**로 본다.  
(문법 오류 전수 검사는 하지 않았고, **내용 불일치** 위주다.)

| 파일 | 문제 요약 |
|------|-----------|
| `docs/architecture.md` | Mermaid에서 `Store → Explain`·`Explain → mergeTrace`가 **항상 도는 흐름**처럼 그려짐. 한 줄 요약도 「AI가 분석·**설명**」으로 explain을 암시. **실제로는 클라이언트가 explain을 호출하지 않음.** |
| `docs/features/trace.md` | 시퀀스 다이어그램에 `S->>AI: /api/explain` 호출이 있음. **스토어가 explain을 부르는 코드는 없음** (병합 로직만 존재). |
| `docs/features/ai-pipeline.md` | 「analyze → explain」2-Phase를 **완성된 제품 파이프라인**처럼 기술. explain **미연동**에 대한 제한 표기 없음. |
| `CLAUDE.md` | 「`/api/analyze` → `/api/explain`」AI 단계·「explain 출력 1:1」 등 **규칙**으로 적혀 있으나, **explain은 앱에서 호출되지 않음.** |
| `prova.md` | ⑥ explain 청크 순차 호출, 다이어그램의 `POST /api/explain`, 체크리스트 **✅** 등 **현재 클라이언트 동작과 불일치** 가능성이 큼. |
| `prompts/ui/02-running.md` | Phase 2 스트리밍·진행률(50→100%) 등 **explain SSE가 돌아가는 UI**를 전제. **해당 호출·UI 연결이 없음.** |
| `prompts/ui/05-data-exploration.md` | Phase 2 실패·「실패한 청크부터 `/api/explain` 재호출」 등 **기획/프롬프트 수준**이며, **동일 동작을 하는 `src` 구현이 없음.** |
| `REFACTOR_TODO.md` | `useProvaExecution` 파이프라인을 `sanitize → analyze → **explain**` 로 기술. **실제 훅에는 explain 호출이 없음.** |

### 오기재가 아닌 예 (대조)

- `prompts/optimization-cash-token/optimization-strategy.md`, `prompts/optimization-cash-token/system-analysis.md` — **explain 미사용·미연동**을 명시한 구간이 있음.
- `docs/diagrams/frogger-deployment-architecture.md`, 본 문서(`docs/api/analyze-explain-routes.md`) — **클라이언트 미호출**을 명시.

### 도구·명령만 언급하는 파일

`.claude/commands/*.md`, `docs/commands.md`, `docs/qa/ai-pipeline.md` 등은 **파일 경로·검증 절차**로 explain 라우트를 나열한 수준이라, 위와 같은 **실행 플로우 오기재**와는 구분한다.
