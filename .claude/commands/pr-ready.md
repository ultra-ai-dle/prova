# /pr-ready — PR 제출 전 최종 검증 + PR Body 생성

## 목적
PR을 올리기 전에 lint, type check, build를 한 번에 돌리고, PR 본문까지 생성한다.

## 입력
- `$ARGUMENTS` — (선택) base 브랜치 지정 (기본값: `main`)

## 실행 절차

1. **사전 상태 확인** (병렬 실행):
   - `git status`로 uncommitted 변경 확인 — 있으면 `/commit`으로 먼저 정리할 것을 안내하고 중단
   - `git log $BASE..HEAD --oneline`으로 커밋 목록 수집

2. **품질 게이트** (순차 실행, 하나라도 실패하면 중단):
   ```
   Step 1: npx tsc --noEmit          → 타입 체크
   Step 2: npm run build              → 빌드
   Step 3: 프롬프트 변경 감지 시 /prompt-diff 실행 → 프롬프트 계약 검증
   ```
   - 빌드 완료 후 `git checkout next-env.d.ts`로 빌드가 덮어쓴 변경을 되돌린다.
   - 각 단계 결과를 PASS/FAIL로 기록한다.
   - FAIL 발생 시 에러 내용을 출력하고, 수정 제안을 제공한다.
   - Step 4는 `git diff $BASE...HEAD --name-only`에 `api/analyze/route.ts` 또는 `api/explain/route.ts`가 포함된 경우에만 실행한다. 해당 파일 변경이 없으면 SKIP 처리한다.
   - 모든 단계 PASS 시에만 다음으로 진행한다.

3. **최종 보고**:
   ```
   ┌─────────────────────────┐
   │ PR Ready Check          │
   ├─────────────┬───────────┤
   │ Type Check  │ ✅ PASS   │
   │ Build       │ ✅ PASS   │
   │ Prompt Diff │ ✅ PASS / ⏭ SKIP │
   ├─────────────┼───────────┤
   │ Status      │ 🚀 Ready  │
   └─────────────┴───────────┘
   ```
   - 모든 게이트 PASS 시에만 4단계로 진행한다.

4. **PR Body 생성**:
   - `git log $BASE...HEAD --oneline`으로 커밋 목록을 수집한다.
   - `git diff $BASE...HEAD`로 변경 내용을 분석한다.
   - 다음 형식으로 PR 본문을 출력한다:

   ```markdown
   ## 변경 전
   - 어떤 문제가 있었는지 / 어떤 상태였는지

   ## 변경 이유
   - 왜 이 변경이 필요했는지

   ## 변경 후
   - 무엇이 달라졌는지 (파일/기능 단위로)

   ## 체크리스트
   <!-- 작업 항목: git log 커밋 메시지 기반으로 자동 생성 -->
   - [x] {커밋 메시지 기반 작업 항목}
   - [x] {커밋 메시지 기반 작업 항목}
   <!-- 품질 게이트: 2번 실행 결과로 채움 -->
   - [x] 타입 체크 통과
   - [x] 빌드 통과
   ```
   - "변경 전/이유"는 커밋 메시지와 diff 내용을 분석하여 추론한다.
   - "변경 후"는 `git diff --stat` 기준 파일/기능 단위로 요약한다.
   - 체크리스트의 작업 항목은 커밋 메시지에서 자동 추출한다.

## 주의사항
- 이 커맨드는 코드를 수정하지 않는다. 검증과 보고만 한다.
- FAIL 항목이 있으면 PR Body를 생성하지 않는다.
- uncommitted 변경이 있으면 `/commit` 사용을 안내하고 중단한다.
- PR Body는 출력만 한다 — 실제 PR 생성(`gh pr create`)은 하지 않는다.