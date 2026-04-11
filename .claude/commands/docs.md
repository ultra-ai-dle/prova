# /docs — 문서화 업데이트

## 목적

변경된 코드를 기반으로 아키텍처 문서, 인라인 주석, 타입 JSDoc을 업데이트한다.
README는 수동 관리 대상이므로 이 커맨드의 범위가 아니다.

## 입력

- `$ARGUMENTS` — (선택) 특정 영역 지정 (예: `arch`, `types`, `api`). 미지정 시 전체 스캔.

## 실행 절차

1. **변경 감지**: `git diff main...HEAD`로 현재 브랜치에서 변경된 파일 목록을 확인한다.
2. **영역별 업데이트**:

   **아키텍처 문서** (`arch` 또는 전체):
   - 문서 구조:
     - `docs/architecture.md` — 전체 파이프라인 개요, 모듈 경계 요약, 핵심 제약
     - `docs/features/execution.md` — Worker 실행 엔진
     - `docs/features/trace.md` — trace 수집 + 병합
     - `docs/features/ai-pipeline.md` — analyze/explain AI 파이프라인
     - `docs/features/visualization.md` — 시각화 전략별 구조
   - 각 문서는 `한줄 요약 → 데이터 흐름 → 모듈 경계 → 핵심 제약` 포맷을 따른다.
   - 데이터 흐름 다이어그램은 반드시 Mermaid(` ```mermaid `)로 작성한다 — ASCII 박스 다이어그램 사용 금지.
   - Mermaid 차트 유형: 파이프라인 흐름은 `flowchart`, 시퀀스는 `sequenceDiagram`, 클래스 구조는 `classDiagram`.
   - 변경된 파일이 아키텍처 경계(Worker 메시지, Store shape, API 계약)에 영향을 주면 해당 문서를 반영한다.
   - feature가 추가되면 `docs/features/` 아래에 같은 포맷으로 새 문서를 생성한다.

   **타입 JSDoc** (`types` 또는 전체):
   - `src/types/prova.ts`의 interface/type에 JSDoc이 누락된 필드 확인
   - 변경된 타입의 기존 JSDoc이 여전히 정확한지 검증
   - AI 프롬프트에서 참조하는 타입은 특히 정확해야 함

   **API 라우트** (`api` 또는 전체):
   - `/api/analyze`, `/api/explain`의 request/response 스키마 주석
   - 프롬프트 변경 시 입출력 계약이 주석과 일치하는지 확인

   **인라인 주석**:
   - 변경된 파일에서 로직이 자명하지 않은 부분에만 주석 추가
   - 기존 주석이 코드와 불일치하면 수정 또는 제거

   **기획서 싱크 체크** (`sync` 또는 전체):
   - `prova.md` 기획서와 현재 코드 상태를 비교하여 어긋나는 부분을 경고한다.
   - 체크 항목:
     - 기획서에 언급된 지원 언어 vs 실제 Worker 구현 (`public/worker/`)
     - 기획서의 파이프라인 설명 vs 실제 코드 흐름
     - 기획서의 시각화 전략 목록 vs 실제 strategy enum 값
   - 수정은 하지 않는다 — 불일치 목록만 출력한다.
   - 출력 형식:
     ```
     ⚠️ 기획서 싱크 체크
     - prova.md: "Python 코드를 직접 실행" → 현재 JS 지원도 추가됨
     - prova.md: 시각화 전략 3종 → 현재 GRID_LINEAR 포함 4종
     ```

3. **커밋**: 변경된 내용을 바탕으로 아래 형식으로 커밋한다.

docs: {업데이트된 영역} 문서화 업데이트

- {변경 항목 1}
- {변경 항목 2}

예시:
docs: 아키텍처, API 라우트 문서화 업데이트

- docs/architecture.md 데이터 흐름 섹션에 JS Worker 경로 추가
- /api/explain SSE 응답 스키마 주석 추가

## 주의사항

- 코드 로직은 변경하지 않는다. 문서와 주석만 다룬다.
- 불필요한 주석(자명한 코드에 대한 설명)은 추가하지 않는다.
- `README.md`는 수동 관리한다 — 이 커맨드로 수정하지 않는다.
- `prova.md` 기획서는 수동 관리 대상이다 — 싱크 체크로 불일치를 알려주지만, 직접 수정하지 않는다.
- `prompts/` 디렉토리(AI 프롬프트 모음)는 이 커맨드의 범위가 아니다.
