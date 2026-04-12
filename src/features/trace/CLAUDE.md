# Trace 수집 + 병합

## Status

- [x] 구현
- [ ] 테스트
- [x] 문서화

## Domain Context

- Worker가 수집한 rawTrace와 AI가 생성한 annotated를 1:1로 병합하여 mergedTrace 생성
- 상세 아키텍처: [docs/features/trace.md](../../../docs/features/trace.md)

## Rules

- `mergedTrace[i]` = `{...rawTrace[i], ...annotated[i]}` — 1:1 병합
- Store 액션에서 `mergeTrace()` 자동 호출 — 수동 병합 금지
- `annotated`가 짧으면 `EMPTY_ANNOTATED`로 패딩, 길면 초과분 무시
- `runtimeError`(Worker)와 `aiError`(AI)는 키가 달라 충돌 없이 공존
- 병합 후 `mergedTrace.length === rawTrace.length` 보장

## Test Coverage

유닛 테스트: mergeTrace() 병합
- [ ] rawTrace + annotated 길이 동일 → 1:1 병합 정상
- [ ] annotated가 rawTrace보다 짧음 → 나머지 EMPTY_ANNOTATED 패딩
- [ ] annotated가 rawTrace보다 김 → 초과분 무시
- [ ] annotated 배열 내 null/undefined → EMPTY_ANNOTATED로 대체

엣지 케이스:
- [ ] rawTrace 빈 배열 → 빈 배열 반환
- [ ] rawTrace 1개 + annotated 0개 → 1개 step + EMPTY_ANNOTATED
- [ ] runtimeError + aiError 동시 존재 → 두 키 모두 보존 (충돌 없음)

EMPTY_ANNOTATED 검증:
- [ ] explanation === ""
- [ ] visual_actions === []
- [ ] aiError === null

Store 연동:
- [ ] setWorkerResult() → mergeTrace 자동 호출
- [ ] setAnnotated() (SSE 청크 도착) → re-merge 실행
- [ ] mergedTrace.length === rawTrace.length 항상 보장
