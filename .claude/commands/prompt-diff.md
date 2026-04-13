# /prompt-diff — AI 프롬프트 변경 회귀 테스트

## 목적
`/api/analyze/route.ts` 내 인라인 프롬프트 문자열을 수정한 후, 계약 조건이 여전히 만족되는지 정적으로 검증한다.

## 입력
- `$ARGUMENTS` — (선택) 대상 엔드포인트 지정 (`analyze`). 미지정 시 analyze를 검사.

## 실행 절차

1. **프롬프트 변경 감지**:
   - `git diff`로 `/api/analyze/route.ts` 내 인라인 프롬프트 변경을 확인한다.
   - 변경이 없으면 "프롬프트 변경 없음 — 스킵" 으로 종료한다.

2. **계약 조건 정적 검증** (프롬프트 텍스트 분석):

   **/api/analyze 계약:**
   - 출력에 `algorithm`, `strategy`, `key_vars`, `var_mapping`, `display_name` 필드를 요구하는 지시가 있는지
   - `var_mapping[].var_name`이 "반드시 varTypes 키 중 하나"라는 제약이 프롬프트에 명시되어 있는지
   - `strategy`가 `GRID | LINEAR | GRID_LINEAR | GRAPH` 중 하나로 제한되는 지시가 있는지
   - `linear_pivots` 관련 지시가 있으면 `pivot_mode` enum 값이 타입과 일치하는지

3. **타입 호환성 크로스체크**:
   - 프롬프트에서 요구하는 출력 스키마가 `src/types/prova.ts`의 `AnalyzeMetadata`, `AnnotatedStep`, `AiErrorInfo` 타입과 일치하는지 확인한다.
   - 프롬프트에 새 필드를 추가했는데 타입 정의에 없으면 경고한다.

4. **결과 보고**:
   - 각 계약 조건별 PASS/FAIL 표 형태로 출력한다.
   - FAIL 항목은 프롬프트의 어느 부분이 문제인지 구체적으로 인용한다.

## 검증 체크리스트
- [ ] analyze: 필수 출력 필드 5종 요구됨
- [ ] analyze: var_mapping.var_name ∈ varTypes 제약 명시됨
- [ ] analyze: strategy enum 값이 타입과 일치
- [ ] 프롬프트 출력 스키마 ⊆ prova.ts 타입 정의