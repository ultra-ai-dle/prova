# /trace-validate — Trace 스키마 + 병합 무결성 검증

## 목적
Pyodide Worker → Store → AI → Renderer 경계에서 trace 데이터가 올바르게 흐르는지 검증한다.

## 입력
- `$ARGUMENTS` — (선택) 검증 범위 지정 (예: `schema`, `merge`, `vartypes`). 미지정 시 전체 검증.

## 실행 절차

1. **RawTraceStep 스키마 검증** (`schema`):
   - `src/types/prova.ts`의 `RawTraceStep` 정의를 읽는다.
   - Worker 파일(`public/worker/pyodide.worker.js`, `public/worker/js.worker.js`)에서 postMessage로 보내는 데이터 구조가 `RawTraceStep`과 일치하는지 확인한다.
   - 필수 필드: `step`, `line`, `vars`, `scope`, `parent_frames`, `runtimeError`
   - `scope`는 `{ func: string, depth: number }` 형태여야 한다.

2. **varTypes 합집합 검증** (`vartypes`):
   - Worker에서 생성하는 `varTypes`의 키가 실제 `rawTrace[].vars`의 키 합집합과 일치하는지 로직을 추적한다.
   - `/api/analyze`에서 `varTypes`를 받아 `var_mapping.var_name`을 생성할 때, 존재하지 않는 변수명을 참조하는 경로가 없는지 확인한다.

3. **mergedTrace 병합 무결성** (`merge`):
   - `src/features/trace/merge.ts`의 병합 로직을 읽는다.
   - `rawTrace.length !== annotatedChunk.length` 일 때 `EMPTY_ANNOTATED` 패딩이 올바르게 적용되는지 확인한다.
   - 병합 후 `mergedTrace[i]`에 `RawTraceStep` + `AnnotatedStep` 필드가 모두 존재하는지 확인한다.
   - `runtimeError`와 `aiError`가 충돌 없이 공존하는지 확인한다.

4. **결과 보고**: 이슈가 있으면 파일명:라인 형태로 구체적으로 보고한다.

## 검증 체크리스트
- [ ] Worker postMessage 페이로드 ⊇ RawTraceStep 필수 필드
- [ ] varTypes 키 ⊇ rawTrace vars 키 합집합
- [ ] var_mapping.var_name ∈ varTypes 키
- [ ] mergedTrace.length === rawTrace.length (패딩 포함)
- [ ] runtimeError step에서 aiError 공존 가능
- [ ] EMPTY_ANNOTATED 패딩 시 explanation='', visual_actions=[], aiError=null
