# Execution Engine

## Status

- [x] 구현
- [ ] 테스트
- [x] 문서화

## Domain Context

- Web Worker 기반 Python(Pyodide)/JS(Acorn) 코드 실행 + Java 원격 실행(`/api/java/execute`) + trace 수집 엔진
- 상세 아키텍처: [docs/features/execution.md](../../../docs/features/execution.md), [docs/features/java-execution.md](../../../docs/features/java-execution.md)

## Rules

- Worker 통신은 반드시 `ProvaRuntime` 클래스를 통해서만 (직접 postMessage 금지)
- Worker 메시지 포맷 변경 시 양쪽(Worker + 메인 스레드) 동시 수정 필수
- timeout: 120초, maxTraceSteps: 10,000
- 직렬화: 깊이 3단계, 순환참조 → `"<circular>"`, 컬렉션 잘림 root 30 / nested 128

## Test Coverage

유닛 테스트: ProvaRuntime 라이프사이클
- [ ] `init()` → Worker 생성 + `onReady` 콜백 호출
- [ ] `run(code, stdin)` → `onDone(WorkerDonePayload)` 정상 수신
- [ ] `destroy()` → Worker 종료 + timeout 클리어

입력 검증:
- [ ] 빈 코드 → `onInvalidInput` 호출
- [ ] Python 빈 stdin → `onInvalidInput` 호출
- [ ] JS 빈 stdin → 정상 실행 (stdin 검증 없음)

타임아웃:
- [ ] 120초 초과 → `onTimeout` + Worker terminate
- [ ] 타임아웃 후 재실행 → 새 Worker 자동 생성
- [ ] 연속 `run()` 호출 → 이전 timeout 클리어 (중복 방지)

Worker 에러:
- [ ] Worker `onerror` 이벤트 → `onError(Error)` 전달
- [ ] Worker `"invalid_input"` 메시지 → `onInvalidInput` 전달

직렬화 엣지 케이스:
- [ ] 순환참조 → `"<circular>"` 치환
- [ ] 컬렉션 크기 초과 → root 30 / nested 128 잘림 + `"...(+N)"` 표시
- [ ] NaN/Infinity → 문자열 변환
- [ ] 깊이 3단계 초과 → 잘림

Trace 수집:
- [ ] maxTraceSteps(10,000) 초과 → 경고 step 추가 + trace 중단
- [ ] `runtimeError` 발생 시 → 에러 라인 번호 추출 + 마지막 step에 기록
- [ ] `SystemExit` → 에러 아닌 정상 종료 처리
- [ ] Python/JS varTypes 추론 — 2D list, int/float 구분
