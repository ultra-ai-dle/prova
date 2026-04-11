# 리팩토링 & 테스트 TODO

## 현황 분석

- 총 소스 파일 수: 23개 (TS/TSX)
- 리팩토링 필요 파일: 6개
- 리팩토링 불필요 파일: 11개 (이미 단일 책임)
- 테스트 커버리지: 0%

### 잘 구조화된 파일 (변경 불필요)

| 파일 | 줄수 | 판단 근거 |
|------|------|----------|
| `src/store/useProvaStore.ts` | 109 | 순수 상태관리, 단일 책임 |
| `src/features/execution/runtime.ts` | 97 | Worker 래퍼, 단일 책임 |
| `src/features/trace/merge.ts` | 22 | 순수 병합 함수 |
| `src/features/visualization/callTreeBuilder.ts` | 220 | 트리 구축 유틸 |
| `src/features/visualization/CallTreePanel.tsx` | 228 | 단일 컴포넌트 |
| `src/features/visualization/linearPointerHelpers.ts` | 127 | 포인터 유틸 |
| `src/lib/ai-providers.ts` | 429 | 프로바이더 체인 (줄수 많으나 단일 책임) |
| `src/lib/analyzeCache.ts` | 131 | LRU 캐시 |
| `src/lib/tagNormalize.ts` | 26 | 태그 정규화 |
| `src/lib/graphModeInference.ts` | 47 | 그래프 방향 추론 |
| `src/lib/partitionPivotEnrichment.ts` | 74 | 피벗 보강 |

---

## 리팩토링 대상 파일

| 파일 | 줄수 | 문제 유형 | 분리 계획 | 우선순위 |
|------|------|----------|----------|---------|
| `app/page.tsx` | 2,381 | 인라인 SVG 6개, 유틸/상수/훅 혼재 | icons.tsx + 7개 lib + 4개 hooks 분리 | 1~3순위 |
| `GraphPanel.tsx` | 1,996 | 인라인 SVG (뷰 내), 8개 특수뷰 내장, 감지/포맷 중복 | specialViews/ + graphHelpers + 공유 lib | 1~3순위 |
| `ThreeDVolumePanel.tsx` | 1,191 | 인라인 SVG 4개 아이콘 | icons.tsx로 분리 | 1순위 |
| `analyze/route.ts` | 969 | 파싱/정규화/보강 혼재, 타입 누출 | 4개 lib 분리 | 2~4순위 |
| `GridLinearPanel.tsx` | 449 | 인라인 SVG 1개, 배열감지 중복 | icons.tsx + dataDetection 공유 | 1~2순위 |
| `TimelineControls.tsx` | 149 | 인라인 SVG 1개 | icons.tsx로 분리 | 1순위 |

---

## 중복 코드 목록

| 중복 대상 | 위치 | 통합 방안 |
|----------|------|----------|
| `stripCodeFence()` / `stripFence()` | `analyze/route.ts:55` + `explain/route.ts:51` | `src/lib/jsonParsing.ts` |
| `is2DArray()` | `GraphPanel.tsx:349` + `GridLinearPanel.tsx` | `src/lib/dataDetection.ts` |
| `is2DBitmaskGrid()` | `GraphPanel.tsx:1191` + `GridLinearPanel.tsx` | `src/lib/dataDetection.ts` |
| `highlightPythonLine()` / `highlightJsLine()` | `page.tsx:331` + `page.tsx:292` (80% 동일) | `src/lib/syntaxHighlight.ts` |
| `formatScalar()` / `formatCellValue()` | `GraphPanel.tsx:362` + `GridLinearPanel.tsx` | `src/lib/formatValue.ts` |
| `toFiniteNumber()` / `toNumber()` | `GraphPanel.tsx:187` + `ThreeDVolumePanel.tsx` | `src/lib/formatValue.ts` |

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
it('mergeTrace는 annotated가 짧을 때 EMPTY_ANNOTATED로 패딩한다')
it('stripCodeFence는 마크다운 코드 블록을 제거한다')
it('GridLinearPanel은 step이 null일 때 플레이스홀더를 보여준다')
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

- [ ] `src/lib/syntaxHighlight.ts` 생성
- [ ] `page.tsx` → `highlightJsLine()`(L292), `highlightPythonLine()`(L331) 추출
- [ ] 공통 토크나이징 로직 통합 (먼저 그대로 추출 → 테스트 통과 후 통합)
- [ ] 유닛 테스트 작성 → `npm run test` 통과

#### 2C. Trace 정제

- [ ] `src/lib/traceSanitize.ts` 생성
- [ ] `page.tsx` → `BLOCKED_RUNTIME_VAR_NAMES`(L382), `isRuntimeNoiseVar()`(L413), `sanitizeRawTrace()`(L436), `sanitizeVarTypes()`(L450), `collectUserDeclaredSymbols()`(L461), `sanitizeRawTraceWithAllowlist()`(L596), `sanitizeVarTypesWithAllowlist()`(L612) 추출
- [ ] 유닛 테스트 작성 → `npm run test` 통과

#### 2D. JSON 파싱 (API 공유)

- [ ] `src/lib/jsonParsing.ts` 생성
- [ ] `analyze/route.ts` → `stripCodeFence()`(L55), `extractFirstJsonObject()`(L63), `sanitizeJsonCandidate()`(L97), `tryParseAnalyzeJson()`(L107) 추출
- [ ] `explain/route.ts` → `stripFence()`(L51) 제거, `jsonParsing.ts` import로 교체
- [ ] 유닛 테스트 작성 → `npm run test` 통과

#### 2E. 값 포맷팅 (패널 공유)

- [ ] `src/lib/formatValue.ts` 생성
- [ ] `GraphPanel.tsx` → `toFiniteNumber()`(L187), `formatScalar()`(L362), `formatCompact()`(L376), `toJsonLike()`(L381), `toJsonCompact()`(L410), `toJsonPreferSingleLine()`(L429), `toNumeric()`(L434), `isPlainObject()`(L359) 추출
- [ ] `ThreeDVolumePanel.tsx` → `toNumber()` 제거, `toFiniteNumber` 사용으로 교체
- [ ] `GridLinearPanel.tsx` → `formatCellValue()` 제거, `formatScalar` 사용으로 교체
- [ ] `page.tsx` → `maxNumericAbs()`(L669), `formatWithBitMode()`(L683) 추출
- [ ] 유닛 테스트 작성 → `npm run test` 통과

#### 2F. 데이터 감지 (패널 공유)

- [ ] `src/lib/dataDetection.ts` 생성
- [ ] `GraphPanel.tsx` → `is2DArray()`(L349), `is1DArray()`(L352), `to2D()`(L355), `looksLike2DScalarTableGrid()`(L482), `is2DRectangularCellGrid()`(L501), `detectGraphLike()`(L516), `isClearlyGridLike()`(L533), `isDirectionVectorTuple()`(L549), `isDirectionVectorListLike()`(L556), `isDirectionMapLike()`(L568), `canGraphLikeUseGridView()`(L576), `is3DBooleanStateGrid()`(L1177), `is2DBitmaskGrid()`(L1191), `inferBitWidthFromGrid()`(L1203), `expand2DBitmaskGridTo3D()`(L1214) 추출
- [ ] `GridLinearPanel.tsx` → 중복 함수 제거, `dataDetection.ts` import로 교체
- [ ] 유닛 테스트 작성 → `npm run test` 통과

#### 2G. 텍스트 유틸

- [ ] `src/lib/textUtils.ts` 생성
- [ ] `page.tsx` → `lineFromOffset()`(L375), `stableStringifyObject()`(L624), indent 감지/변환 로직 추출
- [ ] 유닛 테스트 작성 → `npm run test` 통과

### Phase 3: 비즈니스 로직 / 훅 분리 (3순위)

#### 3A. 특수 자료구조 뷰 (GraphPanel에서 분리)

- [ ] `src/features/visualization/specialViews/` 디렉토리 생성
- [ ] `HeapTreeView` + `computeHeapPositions()` → `specialViews/HeapTreeView.tsx`
- [ ] `QueueView` → `specialViews/QueueView.tsx`
- [ ] `StackView` → `specialViews/StackView.tsx`
- [ ] `DequeView` → `specialViews/DequeView.tsx`
- [ ] `UnionFindView` + `buildUFForest()` + `layoutUFForest()` → `specialViews/UnionFindView.tsx`
- [ ] `VisitedView` → `specialViews/VisitedView.tsx`
- [ ] `DistanceView` → `specialViews/DistanceView.tsx`
- [ ] `ParentTreeView` → `specialViews/ParentTreeView.tsx`
- [ ] `specialViews/index.ts` barrel 파일 생성
- [ ] `GraphPanel.tsx`에서 제거 + import 교체
- [ ] `npm run build` 통과 확인

#### 3B. 그래프 헬퍼

- [ ] `src/features/visualization/graphHelpers.ts` 생성
- [ ] `GraphPanel.tsx` → 타입(`GraphNode`, `GraphLink`, `SimNode`, `SimLink`, `GraphStepState`, `LinkVisual`), `linkStyleForStep()`(L58), `nodePalette()`(L87), `toNodeId()`(L196), `pushVisitedFromValue()`(L203), `extractResultOrder()`(L229), `deriveGraphStepState()`(L256), `getSimLinkEndId()`(L335), `topologySignature()`(L340), `shortenEdgeEndpoints()`(L97), `svgSafeId()`(L121), `getPositiveMaxInGrid()`(L442), `getGridCellTone()`(L452), `GraphLegendOverlay`(L125) 추출
- [ ] `npm run build` 통과 확인

#### 3C. 커스텀 훅 (page.tsx에서 분리)

- [ ] `src/hooks/useKeyboardNavigation.ts` — 키보드 단축키 useEffect 추출
- [ ] `src/hooks/usePlaybackTimer.ts` — 재생 타이머 useEffect 추출
- [ ] `src/hooks/useDragResize.ts` — 패널 드래그 useEffect 추출
- [ ] `src/hooks/useProvaExecution.ts` — 실행 파이프라인 (sanitize → analyze → explain) 추출
- [ ] `npm run build` 통과 확인
- [ ] 드래그/재생/키보드/실행 수동 QA

### Phase 4: API / 서비스 레이어 분리 (4순위)

#### 4A. 타입 이동

- [ ] `AnalyzeAiResponse` 타입 → `analyze/route.ts`(L12-50)에서 `src/types/prova.ts`로 이동

#### 4B. Analyze 분해

- [ ] `src/lib/analyzeEnrichment.ts` — `applyDequeHints()`(L435), `applyJsArrayHints()`(L483), `applyDirectionMapGuards()`(L547), `applyGraphModeInference()`(L581), `enrichSpecialVarKinds()`(L607), `enrichLinearPivots()`(L713) + 헬퍼 추출
- [ ] `src/lib/analyzeNormalize.ts` — `normalizeResponse()`(L297), `parseLinearPivots()`(L256), `parseLinearContextVarNames()`(L283), `compactCodeForAnalyze()`(L135), `compactVarTypes()`(L143), `fallbackAnalyzeMetadata()`(L869) 추출
- [ ] `src/lib/analyzePrompt.ts` — `ANALYZE_GEMINI_SCHEMA`(L196), `ANALYZE_CODE_CHAR_LIMIT`(L52), `ANALYZE_VAR_TYPES_LIMIT`(L53), 프롬프트 구성 로직 추출
- [ ] `analyze/route.ts` POST 핸들러만 남기기 (목표: ~200줄)
- [ ] `npm run build` 통과 확인

### Phase 5: QA

- [ ] `docs/qa/` 기준 시나리오별 수동 테스트 (execution, visualization, playback, trace, ai-pipeline)
- [ ] 전체 파이프라인 E2E 확인: 코드 입력 → 실행 → AI 분석 → 시각화 → 재생

---

## 예상 결과

| 파일 | Before | After | 감소량 |
|------|--------|-------|--------|
| `app/page.tsx` | 2,381 | ~1,000 | -1,381 |
| `GraphPanel.tsx` | 1,996 | ~1,000 | -996 |
| `analyze/route.ts` | 969 | ~200 | -769 |
| `GridLinearPanel.tsx` | 449 | ~350 | -99 |
| `ThreeDVolumePanel.tsx` | 1,191 | ~1,150 | -41 |
| `TimelineControls.tsx` | 149 | ~140 | -9 |

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
