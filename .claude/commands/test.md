# /test — Feature별 테스트 작성 + 커밋

## 목적
지정된 feature에 대한 테스트를 작성하고 커밋한다.

## 입력
- `$ARGUMENTS` — 테스트 대상 feature 경로 또는 이름 (예: `execution/runtime`, `trace/merge`, `visualization/GraphPanel`)

## 실행 절차

1. **대상 파일 확인**: `$ARGUMENTS`에 해당하는 소스 파일을 찾아 읽는다.
2. **기존 테스트 확인**: 해당 feature에 이미 테스트가 있는지 `__tests__/` 또는 `*.test.ts(x)` 패턴으로 탐색한다.
3. **테스트 작성**:
   - 해당 feature의 public interface(export된 함수, 타입)를 기준으로 테스트 케이스를 작성한다.
   - 이 프로젝트의 핵심 타입은 `src/types/prova.ts`에 정의되어 있다 — 테스트 fixture 작성 시 참고한다.
   - 해당 feature의 `CLAUDE.md`에 Test Coverage 체크리스트가 있으면 이를 기준으로 작성한다.
   - 기존 테스트 파일이 있으면 패턴을 따르고, 없으면 `__tests__/[feature명].test.ts` 경로에 생성한다.

   **커버해야 할 케이스:**
   - 정상 케이스 (happy path)
   - 에러 케이스 (예외, 실패 응답)
   - 빈 상태 케이스 (null, undefined, 빈 배열, 빈 객체)
   - 경계값 (0, 음수, 상한 초과, 타입 불일치)
   - 비동기 처리 (로딩 중, 완료, 실패) — 해당 시

   **테스트 메시지 형식 (한글):**
   - 정상: `[함수/컴포넌트]는 [조건]일 때 [결과]를 반환한다`
   - 예외: `[함수/컴포넌트]는 [조건]인 경우 [예외]를 던진다`
   - UI: `[컴포넌트]는 [조건]일 때 [UI 변화]를 보여준다`

   ```typescript
   // 예시
   it('mergeTrace는 annotated가 짧을 때 EMPTY_ANNOTATED로 패딩한다')
   it('tryParseAnalyzeJson은 깨진 JSON인 경우 null을 반환한다')
   it('GridLinearPanel은 step이 null일 때 플레이스홀더를 보여준다')
   ```
4. **테스트 실행**: 작성한 테스트를 실행하여 통과 여부를 확인한다.
5. **커밋**: 테스트 파일만 스테이징하여 아래 형식으로 커밋한다.

   ```
   test: [feature명] 테스트 추가

   - [테스트 내용 요약]
   - [테스트 내용 요약]
   ```

   예시:
   ```
   test: trace/merge 테스트 추가

   - mergeTrace 정상 병합 + EMPTY_ANNOTATED 패딩
   - annotated 초과분 무시 + runtimeError/aiError 공존
   ```

## 주의사항
- 소스 코드는 수정하지 않는다. 테스트만 작성한다.
- mock은 최소화하고, 실제 로직을 테스트하는 것을 우선한다.
- Worker 관련 테스트는 postMessage 인터페이스 기준으로 작성한다.
