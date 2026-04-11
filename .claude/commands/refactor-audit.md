# /refactor-audit — Export 타입/시그니처 호환성 검증

## 목적
리팩토링 전후로 public interface(export된 타입, 함수 시그니처)가 깨지지 않았는지 검증한다.
`src/types/prova.ts` 타입이 Store → API → Worker → Visualization 전체를 관통하므로, 한 곳의 변경이 연쇄적으로 영향을 미치는지 추적한다.

## 입력
- `$ARGUMENTS` — (선택) 검사 범위 지정 (예: `types`, `store`, `api`, `worker`, `viz`). 미지정 시 전체 검사.

## 실행 절차

1. **변경 파일 식별**: `git diff main...HEAD --name-only`로 변경된 파일 목록을 수집한다.

2. **타입 경계 추적** (`types`):
   - `src/types/prova.ts`에서 export된 타입/인터페이스 목록을 추출한다.
   - 각 타입을 import하는 파일을 grep으로 찾아 의존성 그래프를 만든다.
   - 변경된 타입이 있으면, 해당 타입을 사용하는 모든 파일이 여전히 호환되는지 확인한다.

3. **Store 인터페이스** (`store`):
   - `src/store/useProvaStore.ts`의 export된 상태/액션 시그니처를 확인한다.
   - 제거되거나 변경된 상태 필드가 있으면, 이를 참조하는 컴포넌트를 추적한다.

4. **API 라우트 계약** (`api`):
   - `/api/analyze`, `/api/explain`의 request body 파싱 + response 구조를 확인한다.
   - 클라이언트에서 호출하는 코드의 기대 구조와 일치하는지 크로스체크한다.

5. **Worker 메시지 포맷** (`worker`):
   - Worker의 postMessage 페이로드 구조가 메인 스레드의 onmessage 핸들러 기대와 일치하는지 확인한다.
   - `WorkerDonePayload` 타입과 실제 Worker 코드의 정합성을 검증한다.

6. **시각화 컴포넌트 props** (`viz`):
   - `GraphPanel`, `GridLinearPanel`, `ThreeDVolumePanel`이 받는 props/store 데이터가 변경된 타입과 호환되는지 확인한다.

7. **후처리 보강 모듈** (`lib`):
   - `src/lib/` 아래 enrichment 함수들이 `prova.ts` 타입에 의존하므로 호환성을 확인한다.
   - 대상: `partitionPivotEnrichment.ts`, `tagNormalize.ts`, `graphModeInference.ts`
   - 특히 `AnalyzeMetadata`, `LinearPivotSpec`, `SpecialVarKind` 등의 필드명/enum 변경 시 영향 추적.

8. **AI 프롬프트 ↔ 타입 동기화** (`prompt`):
   - `app/api/analyze/route.ts`, `app/api/explain/route.ts` 내 프롬프트 문자열이 타입 필드명을 하드코딩하고 있다.
   - 타입 필드명이 변경되면 프롬프트도 함께 수정해야 한다.
   - Gemini structured output 스키마(`route.ts` 내 JSON schema)도 `prova.ts` 타입과 일치해야 한다.
   - 프롬프트 변경이 감지되면 `/prompt-diff` 실행을 권고한다.

9. **빌드 검증**: `npx tsc --noEmit`으로 타입 에러가 없는지 확인한다.

10. **결과 보고**:
    - 경계별 호환성 상태를 표로 출력한다.
    - 깨진 경계가 있으면 어떤 파일의 어떤 라인이 문제인지 구체적으로 보고한다.

## 의존성 경계 맵
```
prova.ts (타입 정의)
  ├── useProvaStore.ts (Store — 상태 + 액션)
  │     ├── page.tsx (메인 페이지)
  │     ├── GraphPanel.tsx
  │     ├── GridLinearPanel.tsx
  │     └── TimelineControls.tsx
  ├── /api/analyze/route.ts (AI Phase 1 + Gemini 스키마 + 프롬프트 필드명)
  ├── /api/explain/route.ts (AI Phase 2 + 프롬프트 필드명)
  ├── src/lib/ (enrichment 모듈)
  │     ├── partitionPivotEnrichment.ts
  │     ├── tagNormalize.ts
  │     └── graphModeInference.ts
  ├── merge.ts (trace 병합)
  ├── runtime.ts (실행 런타임)
  └── Worker files (pyodide.worker.js, js.worker.js) — tsc 범위 밖, 수동 확인 필요
```
