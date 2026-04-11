# /qa — Feature별 QA 체크리스트 생성/업데이트

## 목적
현재 코드 기반으로 사용자 관점의 QA 체크리스트를 생성하거나 업데이트한다.

## 입력
- `$ARGUMENTS` — (선택) 대상 feature 이름 (예: `execution`, `visualization`, `ai-pipeline`, `trace`, `playback`)
  - 생략 시: `git diff main...HEAD --name-only`로 변경된 feature를 자동 감지한다.
  - 변경된 feature가 없으면 전체 feature를 대상으로 한다.

## 실행 절차

1. **대상 feature 결정**:
   - `$ARGUMENTS`가 있으면 해당 feature만 대상으로 한다.
   - 없으면 `git diff main...HEAD --name-only`에서 `src/features/` 하위 변경을 감지한다.
   - feature 이름 → 디렉토리 매핑:
     - `execution` → `src/features/execution/`
     - `trace` → `src/features/trace/`
     - `visualization` → `src/features/visualization/`
     - `playback` → `src/features/playback/`
     - `ai-pipeline` → `app/api/analyze/`, `app/api/explain/`

2. **컨텍스트 수집** (feature별로):
   - 해당 feature의 소스 코드를 읽는다.
   - `CLAUDE.md` (해당 디렉토리)를 읽는다.
   - `docs/features/{feature}.md` 아키텍처 문서를 읽는다.
   - `docs/qa-questions.tsv`에서 관련 QA 원칙을 참고한다.

3. **QA 시나리오 도출**:
   - 다음 4가지 카테고리로 분류한다:
     - **정상 동작** — golden path. 사용자가 기대하는 기본 흐름.
     - **엣지 케이스** — 빈 입력, 최대값, 경계값, 특수 문자 등.
     - **에러 케이스** — 네트워크 실패, AI 실패, Worker 크래시, 타임아웃 등.
     - **UI 상태** — 로딩/완료/에러 전환, 비활성화 상태, 반응형 등.
   - 각 항목은 **사용자 행동 → 기대 결과** 형식으로 작성한다.
   - 코드에서 실제 처리하는 분기/에러 핸들링을 기반으로 도출한다.

4. **문서 작성/업데이트**:
   - 출력 위치: `docs/qa/{feature}.md`
   - 파일이 없으면 새로 생성한다.
   - 파일이 있으면:
     - 기존 체크 상태(`- [x]`)는 유지한다.
     - 코드 변경으로 새로 추가된 시나리오만 추가한다.
     - 코드에서 제거된 기능의 항목은 `~~취소선~~`으로 표시하되 삭제하지 않는다.
   - 문서 상단에 메타 정보를 포함한다:
     ```markdown
     # QA: {Feature 이름}

     > 마지막 업데이트: {오늘 날짜}
     > 대상 파일: {소스 파일 경로들}
     ```

5. **결과 보고**:
   ```
   ✅ QA 체크리스트 업데이트 완료
   - {feature}: {총 항목 수}개 ({새로 추가된 수}개 추가)
   ```

## 출력 형식 예시

```markdown
# QA: Execution Engine

> 마지막 업데이트: 2026-04-11
> 대상 파일: src/features/execution/runtime.ts

## 정상 동작
- [ ] Python 코드 입력 + stdin → 실행 완료 → rawTrace 수집됨
- [ ] JS 코드 입력 → 실행 완료 → rawTrace 수집됨
- [ ] 실행 완료 후 재실행 → 새 Worker 생성 + 정상 동작

## 엣지 케이스
- [ ] 빈 코드 제출 → 에러 메시지 표시 (실행 안 됨)
- [ ] 10,000 step 초과 코드 → step limit 경고 후 중단

## 에러 케이스
- [ ] 문법 에러 코드 → runtimeError + 에러 라인 표시
- [ ] 무한루프 → 120초 타임아웃 → 에러 메시지 표시
- [ ] Worker 크래시 → 에러 콜백 + 재실행 가능

## UI 상태
- [ ] 실행 중 → 로딩 인디케이터 표시
- [ ] 코드 실행 중 → 에디터 ReadOnly 전환
- [ ] 타임아웃 → 에러 표시 + 재실행 버튼 활성화
```

## 주의사항
- QA 항목은 **유닛 테스트가 아니라 사용자 관점의 수동 검증 시나리오**다.
- 코드 내부 구현이 아닌, 사용자가 브라우저에서 확인할 수 있는 동작을 기술한다.
- 기존 `docs/qa-questions.tsv`의 QA 원칙(스크롤 금지, 데스크탑 전용 등)을 반영한다.
- 이 커맨드는 코드를 수정하지 않는다. QA 문서만 생성/업데이트한다.
