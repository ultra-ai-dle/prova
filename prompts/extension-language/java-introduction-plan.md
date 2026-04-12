# Prova Java 도입 계획서

> 브라우저 기반 Python/JavaScript 파이프라인에 **Java 실행·트레이싱**을 추가하기 위한 범위, 아키텍처, 단계별 일정을 정리한 문서입니다.  
> 전제: Java는 **클라이언트 Web Worker만으로는 현실적인 라인 단위 트레이싱이 어렵고**, 문서 [`architecture-and-language-extension.md`](./architecture-and-language-extension.md)에서 정의한 대로 **서버(또는 전용 실행 서비스) 측 JVM**이 필요합니다.

---

## 1. 목표

| 구분 | 내용 |
|------|------|
| **제품 목표** | 사용자가 Java 코드를 입력하고, Python/JS와 동일하게 **스텝 단위 변수 스냅샷 + 타임라인 + AI 분류(`/api/analyze`)**를 이용할 수 있게 한다. |
| **기술 목표** | 기존 `RawTraceStep` / `varTypes` 계약을 유지하여 **시각화·merge·스토어·대부분의 analyze 로직은 재사용**한다. |
| **비기능 목표** | 샌드박스(격리), 타임아웃·메모리 한도, 동시 실행 제한, 남용 방지(쿼터)를 명시한다. |

---

## 2. 범위

### 2.1 MVP (1차)

- **단일 파일 / 단일 `public class`** 가정 (패키지 선언은 고정 또는 생략 규칙 명시).
- **동기적 알고리즘 코드** 위주 (`main` 또는 고정 엔트리 메서드에서 시작).
- **표준 입출력**: `stdin` 문자열 → `System.in`에 바인딩(또는 스캐너 래핑), `System.out` → `stdout` 배열로 수집.
- **컬렉션·배열·기본형·문자열** 위주 직렬화; **임의 객체 그래프 전체**는 제한적 표현(깊이·개수 캡).
- **트레이스**: 라인 단위 또는 “의미 있는 스텝” 단위(메서드 진입/라인 이벤트) — 구현 방식은 4절에서 선택.

### 2.2 1차에서 제외(명시적 비범위)

- Android / Spring / 멀티 모듈 / 외부 Maven 의존성 자유 사용.
- `async`에 해당하는 복잡한 동시성(Executor, CompletableFuture 등) 완전 시각화.
- JNI / 네이티브 코드.
- 디버거 수준의 완전한 값 검사(모든 필드 브레이크).

추후 단계에서 범위를 넓힐 때마다 본 문서를 개정한다.

---

## 3. 아키텍처 개요

### 3.1 현재 구조 (요약)

```
[page.tsx] → ProvaRuntime → Web Worker(pyodide / js) → { rawTrace, varTypes }
                ↓ (실행 완료 후)
         fetch /api/analyze → AnalyzeMetadata → 시각화
```

### 3.2 Java 도입 후 구조

```
[page.tsx]
    → ExecutionBackend 선택
        ├─ LocalWorkerBackend   → 기존 Worker (python / javascript)
        └─ RemoteJavaBackend    → HTTP(S) 또는 WebSocket/SSE → [Java 실행 서비스]
                ↓ 동일 스키마
         { rawTrace, varTypes, branchLines? }
                ↓
         기존 merge / store / 시각화 / /api/analyze
```

**원칙**: UI와 시각화는 **`RawTraceStep[]`가 들어오면 동일**하게 동작하도록 유지한다.

### 3.3 컴포넌트 분리(권장)

| 컴포넌트 | 책임 |
|----------|------|
| **Next 앱 (프론트)** | 언어 선택, 코드·stdin 전송, 스트림 수신 또는 단건 응답 처리, 상태 반영. |
| **실행 API 게이트웨이** (Next Route 또는 BFF) | 인증·쿼터·요청 크기 제한, 실행 서비스로 프록시. |
| **Java 실행 서비스** (별도 프로세스 권장) | 컴파일(`javac`), JVM 기동, 트레이스 수집, 프로세스 종료·정리. |

실행 서비스를 Next와 **동일 프로세스에 두지 않는 것**이 운영·보안상 유리하다(장애 격리, 리소스 한도).

---

## 4. 트레이싱 전략 (선택지)

아래 중 하나를 MVP에 채택하고, PoC에서 검증 후 확정한다.

| 방식 | 장점 | 단점 |
|------|------|------|
| **A. JVMTI / JDWP 스타일** | 정확한 라인 이벤트 가능 | 구현·배포 복잡, 네이티브 에이전트 관리 |
| **B. 바이트코드 계측 (ASM 등)** | 순수 Java로 제어 가능, 배포 단순화 | 계측 범위·성능 튜닝 필요 |
| **C. 소스 레벨 계측 (가공 `main` + 삽입)** | 구현 단순 | 예외·구문 경계에서 라인 매핑 깨질 수 있음 |

**권장**: PoC는 **B 또는 C**로 빠르게 `rawTrace`를 채운 뒤, 정확도 요구가 올라가면 **B를 강화**하는 로드맵.

---

## 5. API·프로토콜

### 5.1 요청 (클라이언트 → 실행 서비스)

```json
{
  "language": "java",
  "code": "...",
  "stdin": "...",
  "limits": {
    "maxTraceSteps": 10000,
    "executionTimeoutMs": 120000,
    "safeSerializeListLimitRoot": 30,
    "safeSerializeListLimitNested": 12
  }
}
```

### 5.2 응답

- **옵션 1**: 실행 종료 후 단일 JSON `{ rawTrace, varTypes, branchLines? }` (Worker와 동일).
- **옵션 2 (권장, 스텝 많을 때)**: SSE/WebSocket으로 `step` 이벤트 스트림 후 `done`으로 종료.

스트림 사용 시에도 **최종적으로 Worker의 `postMessage({ type: "done", ... })`와 동일한 페이로드**를 조립할 수 있게 한다.

### 5.3 버전 필드

- `traceFormatVersion` (정수)를 페이로드에 포함해 향후 스키마 확장 시 호환성을 관리한다.

---

## 6. 클라이언트 변경 요약

| 영역 | 작업 |
|------|------|
| `ProvaRuntime` 또는 상위 | `language === "java"`일 때 Worker 대신 **원격 실행 클라이언트** 호출. |
| `page.tsx` | Java 선택 시 stdin 규칙(필수 여부), 배지 문구, 하이라이팅(최소 키워드 세트 또는 Monaco 등 검토). |
| `app/api/analyze/route.ts` | `language === "java"` 분기: 프롬프트에 Java 문법·컬렉션·반복자 힌트 추가. |

시각화 패키지(`GridLinearPanel`, `GraphPanel` 등)는 **변경 최소화**를 원칙으로 한다.

---

## 7. 보안·운영

| 항목 | 내용 |
|------|------|
| **격리** | 컨테이너 또는 전용 VM, 네트워크 아웃바운드 차단(또는 허용 목록). |
| **리소스** | CPU 시간, 메모리, 디스크, 동시 작업 수 상한. |
| **입력** | 코드·stdin 최대 크기 제한. |
| **비밀** | 실행 서비스 URL·토큰은 서버 환경 변수만 사용. |
| **로깅** | 사용자 코드 전체를 로그에 남기지 않거나, 짧게 마스킹. |

---

## 8. 단계별 일정(제안)

| 단계 | 기간(가이드) | 산출물 |
|------|----------------|--------|
| **Phase 0 — 설계 확정** | 1주 | 트레이싱 방식(A/B/C) 결정, API 스펙 확정, 위협 모델 초안. |
| **Phase 1 — 실행 서비스 PoC** | 2~3주 | `javac` + JVM 실행 + 최소 트레이스 + JSON 출력, 로컬/단일 컨테이너. |
| **Phase 2 — 프론트 연동** | 1~2주 | `RemoteJavaBackend`, `page` 분기, 에러·타임아웃 UX. |
| **Phase 3 — `/api/analyze` Java 프롬프트** | 1주 | 언어별 힌트, fallback, 태그 정규화 검증. |
| **Phase 4 — 하드닝** | 1~2주 | 쿼터, 동시성 제한, 스트리밍, 모니터링. |

일정은 팀 규모·인프라에 따라 조정한다.

---

## 9. 리스크와 대응

| 리스크 | 대응 |
|--------|------|
| 라인 번호와 소스 불일치 | 소스 맵 또는 계측 시 원본 라인 메타데이터 보존. |
| 직렬화 비용·용량 폭주 | `limits`와 깊이·원소 수 캡, 큰 배열은 요약 표시. |
| 악성 코드(포크 봄 등) | 타임아웃·프로세스 킬·동시 실행 제한. |
| 운영 비용 | 서버리스보다 **고정 풀 + 큐**가 예측 가능한 경우가 많음. |

---

## 10. 성공 기준 (MVP 완료 정의)

- [ ] Java 선택 후 동일 UI에서 **디버깅 실행 → 타임라인에 스텝 표시**.
- [ ] 대표 알고리즘 3종 이상(예: 선형 탐색, BFS 인접행렬, 단순 DP)에서 **의미 있는 `vars` 스냅샷**.
- [ ] `/api/analyze`가 Java 코드에 대해 **일관된 `strategy` / `var_mapping`** 을 반환(수동 스팟 체크).
- [ ] 타임아웃·메모리 한도 시 **사용자에게 명확한 메시지**, 서버 안정성 유지.

---

## 11. 참고 문서

- [`architecture-and-language-extension.md`](./architecture-and-language-extension.md) — 전체 파이프라인·언어별 비용.
- [`js-language-implementation-design.md`](./js-language-implementation-design.md) — Worker 프로토콜·계측 아이디어(클라이언트 측 참고).

---

## 12. 개정 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-11 | 초안 작성 |
