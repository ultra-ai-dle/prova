# 리팩토링 & 테스트 TODO

## 현황 분석

- 총 소스 파일 수: 23개 (TS/TSX)
- 리팩토링 필요 파일: 6개
- 리팩토링 불필요 파일: 11개 (이미 단일 책임)
- 테스트 커버리지: 0%

### 잘 구조화된 파일 (변경 불필요)

| 파일                                                 | 줄수 | 판단 근거                               |
| ---------------------------------------------------- | ---- | --------------------------------------- |
| `src/store/useProvaStore.ts`                         | 109  | 순수 상태관리, 단일 책임                |
| `src/features/execution/runtime.ts`                  | 97   | Worker 래퍼, 단일 책임                  |
| `src/features/trace/merge.ts`                        | 22   | 순수 병합 함수                          |
| `src/features/visualization/callTreeBuilder.ts`      | 220  | 트리 구축 유틸                          |
| `src/features/visualization/CallTreePanel.tsx`       | 228  | 단일 컴포넌트                           |
| `src/features/visualization/linearPointerHelpers.ts` | 127  | 포인터 유틸                             |
| `src/lib/ai-providers.ts`                            | 429  | 프로바이더 체인 (줄수 많으나 단일 책임) |
| `src/lib/analyzeCache.ts`                            | 131  | LRU 캐시                                |
| `src/lib/tagNormalize.ts`                            | 26   | 태그 정규화                             |
| `src/lib/graphModeInference.ts`                      | 47   | 그래프 방향 추론                        |
| `src/lib/partitionPivotEnrichment.ts`                | 74   | 피벗 보강                               |

---

## 리팩토링 대상 파일

| 파일                    | 줄수  | 문제 유형                                           | 분리 계획                               | 우선순위 |
| ----------------------- | ----- | --------------------------------------------------- | --------------------------------------- | -------- |
| `app/page.tsx`          | 2,381 | 인라인 SVG 6개, 유틸/상수/훅 혼재                   | icons.tsx + 7개 lib + 4개 hooks 분리    | 1~3순위  |
| `GraphPanel.tsx`        | 1,996 | 인라인 SVG (뷰 내), 8개 특수뷰 내장, 감지/포맷 중복 | specialViews/ + graphHelpers + 공유 lib | 1~3순위  |
| `ThreeDVolumePanel.tsx` | 1,191 | 인라인 SVG 4개 아이콘                               | icons.tsx로 분리                        | 1순위    |
| `analyze/route.ts`      | 969   | 파싱/정규화/보강 혼재, 타입 누출                    | 4개 lib 분리                            | 2~4순위  |
| `GridLinearPanel.tsx`   | 449   | 인라인 SVG 1개, 배열감지 중복                       | icons.tsx + dataDetection 공유          | 1~2순위  |
| `TimelineControls.tsx`  | 149   | 인라인 SVG 1개                                      | icons.tsx로 분리                        | 1순위    |

---

## 중복 코드 목록

| 중복 대상                                     | 위치                                           | 통합 방안                    |
| --------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| `stripCodeFence()` / `stripFence()`           | `analyze/route.ts:55` + `explain/route.ts:51`  | `src/lib/jsonParsing.ts`     |
| `is2DArray()`                                 | `GraphPanel.tsx:349` + `GridLinearPanel.tsx`   | `src/lib/dataDetection.ts`   |
| `is2DBitmaskGrid()`                           | `GraphPanel.tsx:1191` + `GridLinearPanel.tsx`  | `src/lib/dataDetection.ts`   |
| `highlightPythonLine()` / `highlightJsLine()` | `page.tsx:331` + `page.tsx:292` (80% 동일)     | `src/lib/syntaxHighlight.ts` |
| `formatScalar()` / `formatCellValue()`        | `GraphPanel.tsx:362` + `GridLinearPanel.tsx`   | `src/lib/formatValue.ts`     |
| `toFiniteNumber()` / `toNumber()`             | `GraphPanel.tsx:187` + `ThreeDVolumePanel.tsx` | `src/lib/formatValue.ts`     |

---

## TODO 체크리스트

### 테스트 컨벤션 (`.claude/commands/test.md` 준수)

테스트 메시지는 한글로 작성하며, 아래 형식을 따른다:

- 정상: `[함수명]는 [조건]일 때 [결과]를 반환한다`
- 예외: `[함수명]는 [조건]인 경우 [예외]를 던진다`
- 빈 값: `[함수명]는 [빈 입력]일 때 [기본값]을 반환한다`
- UI: `[컴포넌트]는 [조건]일 때 [UI 변화]를 보여준다`

```typescript
// 예시
it('mergeTrace는 annotated가 짧을 때 EMPTY_ANNOTATED로 패딩한다');
it('stripCodeFence는 마크다운 코드 블록을 제거한다');
it('GridLinearPanel은 step이 null일 때 플레이스홀더를 보여준다');
```

### Phase 0: 테스트 환경 세팅

- [x] Vitest + @testing-library/react 설치 및 설정
- [x] `vitest.config.ts` 생성 (tsconfig paths 매핑)
- [x] `npm run test` 스크립트 추가
- [x] `npm run build` 통과 확인 (baseline)

### Phase 1: 인라인 SVG 분리 (1순위 — 영향 범위 최소)

- [x] `src/components/icons/` 디렉토리 생성 (AppIcons, PanelIcons, GridIcons, TimelineIcons, index.ts)
- [x] `page.tsx` → `IconFiles`, `IconSettings`, `IconRefresh`, `IconExpand`, `IconWarning`, `IconPencil` 추출
- [x] `ThreeDVolumePanel.tsx` → `ExpandIcon`(=IconExpand alias), `CollapseIcon`, `ResetViewIcon`, `ClearActiveIcon` 추출
- [x] `GridLinearPanel.tsx` → `GridIcon` 추출 (className prop 기본값 적용)
- [x] `TimelineControls.tsx` → `IconTarget` 추출
- [x] 원본 파일에서 인라인 정의 제거 + import 교체
- [x] `npm run build` 통과 확인
- [x] 아이콘 스냅샷 테스트 작성 (34 tests, 11 snapshots)

### Phase 2: 타입 / 상수 / 유틸 분리 (2순위 — 순수 함수, 의존성 낮음)

#### 2A. 언어 감지

- [x] `src/lib/languageDetection.ts` 생성
- [x] `page.tsx` → `PY_KEYWORDS`, `JS_KEYWORDS`, `PYTHON_LANGUAGE_HINTS`, `JAVASCRIPT_LANGUAGE_HINTS`, `detectLanguageFromCode()` 추출
- [x] 유닛 테스트 작성 → 23개 통과

#### 2B. 구문 하이라이팅

- [x] `src/lib/syntaxHighlight.ts` 생성
- [x] `page.tsx` → `highlightJsLine()`, `highlightPythonLine()` 추출
- [x] 공통 `tokenizeLine(line, config)` 헬퍼로 통합
- [x] 유닛 테스트 작성 → 27개 통과

#### 2C. Trace 정제

- [x] `src/lib/traceSanitize.ts` 생성
- [x] `page.tsx` → `BLOCKED_RUNTIME_VAR_NAMES`, `isRuntimeNoiseVar()`, `sanitizeRawTrace()`, `sanitizeVarTypes()`, `collectUserDeclaredSymbols()`, `sanitizeRawTraceWithAllowlist()`, `sanitizeVarTypesWithAllowlist()` 추출
- [x] 유닛 테스트 작성 → 31개 통과

#### 2D. JSON 파싱 (API 공유)

- [x] `src/lib/jsonParsing.ts` 생성 (`stripCodeFence`, `extractFirstJsonObject`, `sanitizeJsonCandidate`, `tryParseJson<T>`)
- [x] `analyze/route.ts` → 4개 함수 추출 + `tryParseJson<AnalyzeAiResponse>` 제네릭 교체
- [x] `explain/route.ts` → `stripFence()` 제거, `stripCodeFence` import 교체 (중복 제거)
- [x] 유닛 테스트 작성 → 21개 통과

#### 2E. 값 포맷팅 (패널 공유)

- [x] `src/lib/formatValue.ts` 생성 (`toFiniteNumber`, `toNumberWithFallback`, `isPlainObject`, `formatScalar`, `formatCellValue`, `formatCompact`, `toJsonLike`, `toJsonCompact`, `toJsonPreferSingleLine`, `maxNumericAbs`, `formatWithBitMode`)
- [x] `GraphPanel.tsx` → 8개 함수 추출 + `toNumeric`을 `toFiniteNumber`로 통일
- [x] `ThreeDVolumePanel.tsx` → `toNumber()` 제거, `toNumberWithFallback` import 교체
- [x] `GridLinearPanel.tsx` → `formatCellValue()` 제거, `formatValue.ts` import 교체 (동작 차이로 `formatScalar` 교체 불가, 별도 추출)
- [x] `page.tsx` → `maxNumericAbs()`, `formatWithBitMode()` 추출
- [x] 유닛 테스트 작성 → 52개 통과

#### 2F. 데이터 감지 (패널 공유)

- [x] `src/lib/dataDetection.ts` 생성 (17개 함수: 배열 판별, 격자 감지, 그래프/그리드 판별, 방향 벡터, 3D/비트마스크)
- [x] `GraphPanel.tsx` → 15개 감지 함수 추출 + `getPositiveMaxInGrid`, `getGridCellTone` 포함
- [x] `GridLinearPanel.tsx` → `is2DArray`, `bitWidthFromGrid`→`inferBitWidthFromGrid`, `expand2DBitmaskGridTo3D` 공유 import 교체 (`is2DBitmaskGrid`는 구현 차이로 유지)
- [x] 유닛 테스트 작성 → 59개 통과

#### 2G. 텍스트 유틸

- [x] `src/lib/textUtils.ts` 생성 (`lineFromOffset`, `stableStringifyObject`, `detectIndentSize`, `convertIndent`)
- [x] `page.tsx` → 4개 함수 추출 + `applyTabSizeToCode` 내부 변환 로직을 `convertIndent` 호출로 교체
- [x] 유닛 테스트 작성 → 17개 통과

### Phase 3: 비즈니스 로직 / 훅 분리 (3순위)

#### 작성 규칙

- 코드 내용 수정 없이 추출만 한다 — 리팩토링/개선은 별도 작업
- 컴포넌트와 관련 헬퍼 함수를 함께 이동한다 (예: `HeapTreeView` + `computeHeapPositions()`)
- 뷰 내부에서만 쓰이는 SVG(화살표, 연결선 등)는 `specialViews/icons.tsx`로 분리하고 각 뷰에서 import
- 훅 추출 시 useEffect 의존성 배열을 그대로 유지한다 — 의존성 정리는 별도 작업
- 서브태스크 하나 완료할 때마다 `npm run build` + 해당 기능 수동 QA
- QA 실패 시 즉시 멈추고 보고

#### 서브태스크별 QA 체크리스트

| 서브태스크                  | QA 항목                                          |
| --------------------------- | ------------------------------------------------ |
| 3A. 특수뷰 분리             | HEAP/QUEUE/STACK 중 1개 시각화 렌더 확인         |
| 3B. 그래프 헬퍼             | 그래프 시각화 1개 — 노드/엣지 렌더 + 스텝 이동   |
| 3C-1. useKeyboardNavigation | 방향키 ← → 스텝 이동                             |
| 3C-2. usePlaybackTimer      | 재생 → 자동 진행 → 정지                          |
| 3C-3. useDragResize         | 패널 경계 드래그                                 |
| 3C-4. useProvaExecution     | 코드 입력 → Run → 결과 (E2E, 가장 마지막에 진행) |

#### 3A. 특수 자료구조 뷰 (GraphPanel에서 분리)

- [x] `specialViews/types.ts` — `GraphStepState` 타입 분리 (GraphPanel + 뷰 공유)
- [x] `HeapTreeView.tsx` — `computeHeapPositions()` + `toNodeId()` 함께 이동
- [x] `QueueView.tsx`
- [x] `StackView.tsx`
- [x] `DequeView.tsx`
- [x] `UnionFindView.tsx` — `buildUFForest()` + `layoutUFForest()` 함께 이동 (export)
- [x] `VisitedView.tsx`
- [x] `DistanceView.tsx` — `INF_THRESHOLD` 상수 함께 이동
- [x] `ParentTreeView.tsx` — `layoutUFForest`를 UnionFindView에서 import
- [x] `index.ts` barrel 파일 생성
- [x] `GraphPanel.tsx`에서 590줄 제거 + import 교체
- [x] `npm run build` 통과 확인
- [x] 수동 QA: HEAP/QUEUE/STACK 중 1개 시각화 렌더 확인

#### 3B. 그래프 헬퍼

- [x] `graphHelpers.tsx` 생성 — 5개 타입 + `GRAPH_NODE_R` 상수 + 11개 함수 + `GraphLegendOverlay` 컴포넌트
- [x] `GraphPanel.tsx`에서 288줄 제거 + import 교체 (`getPositiveMaxInGrid`/`getGridCellTone`은 이미 dataDetection.ts에 있어 제외)
- [x] `npm run build` 통과 확인
- [x] 수동 QA: 그래프 시각화 1개 — 노드/엣지 렌더 + 스텝 이동

#### 3C. 커스텀 훅 (page.tsx에서 분리)

- [x] `src/hooks/useKeyboardNavigation.ts` — 키보드 단축키 useEffect 추출
- [x] `src/hooks/usePlaybackTimer.ts` — 재생 타이머 useEffect + playTimer ref 추출
- [x] `src/hooks/useDragResize.ts` — 패널 드래그 useEffect + 5개 ref + 상수 추출, ref를 반환하여 JSX에 연결
- [x] `src/hooks/useProvaExecution.ts` — 런타임 생성 useEffect + fetchErrorExplanation + analyzeCacheRef/analyzeInFlightRef 내부화, addToast를 useCallback으로 안정화, runtimeRef 반환
- [x] `npm run build` 통과 확인 (3개 훅 각각)
- [x] 키보드/재생/드래그 수동 QA
- [x] 실행 수동 QA

### Phase 4: API / 서비스 레이어 분리 (4순위)

#### 4A. 타입 이동

- [x] `AnalyzeAiResponse` + `Panel` + `Strategy` 타입 → `src/types/prova.ts`로 이동, `analyze/route.ts`에서 import 교체

#### 4B. Analyze 분해

- [x] `app/api/analyze/_lib/enrichment.ts` — 6개 보강 함수 + 3개 detect 헬퍼 + `uniq` 추출
- [x] `app/api/analyze/_lib/normalize.ts` — `normalizeResponse`, `parseLinearPivots`, `parseLinearContextVarNames`, `fallbackAnalyzeMetadata` 추출
- [x] `app/api/analyze/_lib/prompt.ts` — 상수 + `compactCodeForAnalyze`, `compactVarTypes`, `ANALYZE_GEMINI_SCHEMA` 추출
- [x] `app/api/analyze/_lib/partitionPivotEnrichment.ts` — `src/lib/`에서 이동
- [x] `src/lib/graphModeInference.ts` — 클라이언트+서버 공유이므로 `src/lib/`에 유지
- [x] `analyze/route.ts` → 187줄 (analyzeWithAi + POST 핸들러만 남음, 목표 ~200줄 달성)
- [x] `npm run build` 통과 확인

### 구조 정리 (검토 후 추가)

- [x] `tagNormalize.test.ts` → `src/lib/__tests__/`로 이동
- [x] `TimelineControls.tsx` — page.tsx 인라인 타임라인 UI 추출로 교체 + 에러 점프 버튼 복원
- [ ] 도트 타임라인 vs 슬라이더 토글 기능 추가 (QA + 이름 변경 완료 후)

### Phase 5: QA

- [ ] `docs/qa/` 기준 시나리오별 수동 테스트 (execution, visualization, playback, trace, ai-pipeline)
- [x] 전체 파이프라인 E2E 확인: 코드 입력 → 실행 → AI 분석 → 시각화 → 재생

---

## 예상 결과

| 파일                    | Before | After  | 감소량 |
| ----------------------- | ------ | ------ | ------ |
| `app/page.tsx`          | 2,381  | ~1,000 | -1,381 |
| `GraphPanel.tsx`        | 1,996  | ~1,000 | -996   |
| `analyze/route.ts`      | 969    | ~200   | -769   |
| `GridLinearPanel.tsx`   | 449    | ~350   | -99    |
| `ThreeDVolumePanel.tsx` | 1,191  | ~1,150 | -41    |
| `TimelineControls.tsx`  | 149    | ~140   | -9     |

신규 파일: ~19개 (icons 1 + lib 10 + hooks 4 + specialViews 8+1 barrel - 중복 제외)

---

## 리스크 & 주의사항

- **page.tsx의 `useProvaExecution` 훅 분리가 가장 고위험** — 실행 파이프라인 전체(sanitize → analyze → explain)가 하나의 useEffect에 있고, codeRef, language, addToast, store setter 등 다수의 외부 참조에 의존함. 반드시 마지막에 진행하고, 추출 전 E2E 동작을 확인할 것.
- **`formatScalar` 통합 시 동작 차이 주의** — GraphPanel의 `formatScalar`는 `"True"`→`"T"`, `"False"`→`"F"` 변환을 포함하지만 GridLinearPanel의 `formatCellValue`는 다른 로직을 가짐. 먼저 그대로 추출 → 테스트 통과 후 통합.
- **Phase별 독립 검증** — 각 Phase 완료 후 반드시 `npm run build` 통과를 확인하고, Phase 3~4는 수동 QA를 병행해야 함.
- **CLAUDE.md 규칙 준수** — 타입은 `src/types/prova.ts`에, Worker 통신은 `ProvaRuntime`을 통해서만, AI 호출은 `callWithFallback()`을 통해서만.
- **GraphPanel SVG는 뷰 컴포넌트와 함께 이동** — Queue/Stack/Deque 뷰의 SVG 화살표는 독립 아이콘이 아니라 뷰 로직의 일부이므로, Phase 3A 특수뷰 분리 시 함께 이동함. `icons.tsx`에 넣지 않음.

---

## 발견된 버그 (리팩토링 중 발견, 별도 수정 필요)

- [ ] **`detectLanguageFromCode` 주석 내 키워드 반영 버그** — 라인 구문 스코어링에서는 주석(`#`, `//`)을 제거하지만, 단어 키워드 매칭에서는 원본 텍스트(`compact`)를 사용하여 주석 내 키워드도 스코어에 반영됨. `compact` 대신 주석 제거된 텍스트를 사용해야 함. (`src/lib/languageDetection.ts`)
- [ ] **`collectUserDeclaredSymbols` JS function 파라미터 추출 버그** — `arg.replace(/[=\s].*/, "")`에서 `[=\s]`의 `\s`가 선행 공백을 먼저 매칭하여, 콤마 뒤 공백이 있는 두 번째 이후 파라미터(`", arr"`)가 빈 문자열로 소실됨. `.trim()` 후 `replace` 하거나 `/=.*/`로 변경 필요. (`src/lib/traceSanitize.ts`)
- [ ] **`highlightJsLine` $ 접두 식별자 버그** — JS 토크나이저의 식별자 정규식 `\b[A-Za-z_$][A-Za-z0-9_$]*\b`에서 `\b`가 `$` 앞에서 word boundary로 동작하지 않아, `$el` 같은 식별자가 `"$"(갭) + "el"(식별자)`로 분리됨. `\b` 대신 `(?<![A-Za-z0-9_$])` lookbehind 사용 등으로 수정 필요. (`src/lib/syntaxHighlight.ts`)
- [ ] **`detectIndentSize` 탭 문자 무시 버그** — `/^( +)/`로 공백만 매칭하여 탭(`\t`)으로 들여쓴 코드는 GCD 계산에서 제외됨. 탭 들여쓰기 코드를 붙여넣으면 indent 크기 감지가 작동하지 않아 자동 변환이 트리거되지 않음. (`src/lib/textUtils.ts`)

### 리팩토링 중 발견된 버그 처리 원칙

- 테스트는 **현재 동작**(버그 포함)에 맞춰 작성하고, 테스트 내에 TODO 주석으로 버그를 표시한다
- 소스 코드의 버그 위치에도 TODO 주석을 남긴다
- 이 섹션에 버그 체크리스트를 추가한다
- 버그 수정은 리팩토링 완료 후 별도 작업으로 진행한다
