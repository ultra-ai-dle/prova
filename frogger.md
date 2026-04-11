---

# [기획서] Frogger: AI 기반 알고리즘 시각화 디버거

## 1. 프로젝트 개요
- **서비스명:** Frogger
- **슬로건:** "코드를 실행하면, AI가 그 흐름을 이야기로 만듭니다."
- **핵심 가치:** 브라우저에서 Python 코드를 직접 실행하고, AI가 그 실행 흐름을 단계별 시각화와 자연어 해설로 변환하는 교육용 알고리즘 디버거. AI는 실행을 대신하지 않고, 실행 결과를 해석하는 역할에 집중한다.

---

## 2. 주요 타겟 사용자

1. **코딩 테스트 준비생:** 본인이 짠 알고리즘(BFS, Dijkstra 등)이 왜 틀렸는지, 어디서 인덱스 에러가 나는지 시각적으로 확인하고 싶은 사용자.
2. **개발 숙련자:** 복잡한 로직의 데이터 흐름(DP 테이블 갱신, 트리 재구성 등)을 빠르게 검증하고 싶은 개발자.

---

## 3. 전체 파이프라인 (3단계 공정)

서비스의 핵심 철학: **역할 분리**. 실행의 정확성은 엔진이, 해석과 설명은 AI가, 디자인은 프론트엔드가 전담한다.

```
사용자 코드 + stdin
        │
        ▼
┌────────────────────────────────────────┐
│  Step 1: TRACE (데이터 채굴)            │
│  주체: Pyodide + sys.settrace (Worker) │
│  출력: Raw Trace + branchLines + varTypes │
│    (varTypes는 Worker가 trace 전체 순회로 │
│     타입·형태 합집합만 추출, 메인 스레드  │
│     추가 순회 없음)                      │
└──────────────┬─────────────────────────┘
               │  postMessage({rawTrace, branchLines, varTypes})
               ▼
┌────────────────────────────────────────┐
│  Step 2: AI PHASE (가공 및 해석)        │
│  주체: Gemini Flash (Next.js API Route)│
│  Phase 1: 코드 + varTypes → strategy   │
│           + var_mapping (역할↔실제 변수명) │
│  Phase 2: Snapshot+Delta → explanation │
│           + visual_actions (청크 SSE)  │
│  특징: "이 변수 변화 = 어떤 움직임"을   │
│        판단하는 핵심 브레인             │
└──────────────┬─────────────────────────┘
               │  annotated 청크 도착 시마다
               │  rawTrace[i] + annotated[i] → mergedTrace[i]
               ▼
┌────────────────────────────────────────┐
│  Step 3: RENDERING (시각화)             │
│  주체: React (Framer Motion 등)         │
│  입력: mergedTrace[currentStep]         │
│  출력: 화면 애니메이션                  │
│  특징: AI는 "visit해" 라고 지시.        │
│        색상/속도는 디자인 시스템이       │
│        통제 → 디자인 일관성 보장        │
└────────────────────────────────────────┘
```

**단계별 입출력 요약:**

| 단계     | 입력                              | 처리 주체            | 출력                                                                     |
| -------- | --------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| Step 1   | 코드 + stdin                      | Pyodide (Web Worker) | `{rawTrace, branchLines, varTypes}` (`varTypes`는 Worker 내 합집합 추출) |
| Step 2-① | 코드 + `varTypes` (Worker가 전달) | `/api/analyze`       | `{strategy, key_vars, var_mapping, algorithm, display_name}`             |
| Step 2-② | Snapshot+Delta 청크 + strategy    | `/api/explain` (SSE) | `[{explanation, visual_actions}]` per chunk                              |
| Step 3   | `mergedTrace[i]`                  | React 렌더러         | 화면 애니메이션                                                          |

> **AI의 역할 범위:** AI는 시각화의 **내용(데이터)**만 결정한다. `"push", "visit"` 같은 action 이름만 반환하고, 색상·폰트·애니메이션 속도 등 **형식(디자인)**은 프론트엔드 디자인 시스템이 통제한다.

---

## 4. 실행 순서 흐름

```
[페이지 진입 시 — 자동]
  Web Worker 생성 → Pyodide 백그라운드 로드 → ready 신호 수신 → 실행 버튼 활성화

[사용자가 실행 버튼 클릭 시]
① 메인 스레드 → Worker에 {code, stdin} postMessage
   └─ pyodideStatus: 'ready' → 'running' 전환
   └─ 전송 직후 setTimeout(5000) 시작 → 5초 경과 시 timeout 토스트 UX 발동
② Worker 내부:
     ast.parse(code)          → branchLines 추출 (settrace 이전)
       └─ SyntaxError 발생 시: 즉시 문법 에러 반환(에디터 빨간 밑줄/라인 마커), trace 수집은 시작하지 않음
     sys.settrace + exec()    → rawTrace 수집
③ Worker → 메인 스레드에 {type:'done', rawTrace, branchLines, varTypes} postMessage
   └─ `varTypes`: Worker가 `trace_log` 전체를 **한 번** 순회해 합집합 생성 후 동봉 (메인 스레드 추가 순회 없음 → 대형 trace에서도 UI 프리징 방지)
   └─ 수신 즉시 clearTimeout → 타이머 해제
   └─ (pyodideStatus는 'running' 유지 — AI 설명 스트리밍 완료 시점에 'ready'로 전환)
④ 메인 스레드: rawTrace + branchLines + varTypes → Zustand 저장, 타임라인 Dot 즉시 렌더링
⑤ /api/analyze 호출 (코드 + varTypes 전달 → strategy, var_mapping, key_vars 결정)
⑥ /api/explain 청크 순차 호출 시작 (Phase 2, Snapshot+Delta 형식)
     └─ 전송 전 각 step에서 parent_frames 필드 제거 (AI에게 불필요, 토큰 절약)
     └─ 청크 응답 도착 시마다 rawTrace[i] + annotated[i] → mergedTrace[i] 병합
     └─ mergedTrace 업데이트 → UI 실시간 반영 (스켈레톤 → 설명 채워짐)
⑦ 모든 청크 완료 → mergedTrace 완성, pyodideStatus: 'running' → 'ready', 재생 컨트롤 활성화
```

---

## 5. 핵심 기능 (Core Features)

### A. 실행 인터셉트 엔진 (Pyodide + sys.settrace + Web Worker)

- **브라우저 내 Python 실행:** Pyodide(WebAssembly)가 클라이언트에서 Python을 직접 실행. 외부 서버 불필요.
- **UI 블로킹 방지 (Web Worker):** Pyodide는 전용 Web Worker 안에서 실행. 메인 스레드(UI)는 Python 실행 중에도 로딩 애니메이션·버튼 반응 등 완전히 유지.
- **상태 가로채기:** `sys.settrace` 훅으로 매 라인 실행 시점의 모든 로컬 변수를 수집하여 Raw Trace 생성.
- **안전 실행 제한:**
  - 최대 실행 step: **임계값 기반 제한** (고정 수치 미확정, 운영 파라미터 `N`으로 관리)
  - 실행 timeout: **5초** — 메인 스레드 `setTimeout`으로 관리. 5초 경과 시 아래 토스트 UX 흐름 실행.
  - 무한 루프/스택오버플로우 가능성에 대해 사전 경고를 노출하고, 임계값 초과 시 시뮬레이션을 강제 종료.

    **timeout 토스트 UX 흐름:**

    ```
    5초 경과
      → worker.terminate() 강제 종료
      → 토스트 ⚠️ "실행 시간이 너무 길어 안전을 위해 실행을 중단했습니다. 환경을 재설정합니다."
      → 실행 버튼: [🔄 초기화 중...] 스피너로 교체 (클릭 차단)
      → 새 Worker 생성 + Pyodide 재로드 (백그라운드)
      → ready 신호 수신
      → 토스트 ✅ "환경 준비 완료. 코드를 수정 후 다시 시도해 주세요."
      → 실행 버튼 다시 활성화
    ```

    ```ts
    const timeoutId = setTimeout(() => {
      worker.terminate();
      showToast(
        '⚠️ 실행 시간이 너무 길어 안전을 위해 실행을 중단했습니다. 환경을 재설정합니다.',
      );
      setPyodideStatus('reinitializing'); // Zustand 상태 머신
      worker = new Worker('/worker/pyodide.worker.js');
      worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
          setPyodideStatus('ready');
          showToast('✅ 환경 준비 완료. 코드를 수정 후 다시 시도해 주세요.');
        }
      };
    }, 5000);
    ```

  - 입력값 제한: 배열 크기 최대 20, 그래프 노드 최대 15개 (UI에서 안내)

**Web Worker 통신 구조:**

```
[페이지 진입 시 — 자동 사전 로드]
메인 스레드                        pyodide.worker.js
    │                                      │
    │── (Worker 생성, 메시지 없음) ────────▶│
    │                                      │ Pyodide 바이너리 다운로드 + 로드
    │◀─ postMessage({type:'ready'}) ────────│  ← 이 시점에 실행 버튼 활성화
    │
[사용자가 실행 버튼 클릭 시]
    │── postMessage({code, stdin}) ────────▶│
    │                                      │ AST 분석 (branchLines 추출)  ← 먼저
    │                                      │ sys.settrace + Python 실행
    │                                      │ Raw Trace + branchLines 수집
    │◀─ postMessage({type:'done',           │
    │      rawTrace: [...],                 │
    │      branchLines: {...},              │
    │      varTypes: {...}}) ───────────────│  (실행 완료 — Runtime 에러도 rawTrace에 포함)
    │◀─ postMessage({type:'error',          │
    │      error: {...}}) ──────────────────│  (시스템 장애 — Worker/Pyodide 크래시 시에만)
```

- **Pyodide 사전 로드:** 페이지 진입 시 Worker를 미리 생성하고 Pyodide를 백그라운드 로드. `type: 'ready'` 신호 수신 전까지 실행 버튼 비활성화.
- **varTypes (Worker 전용):** `trace_log` 수집 직후 Worker에서 `extract_var_types_union(trace_log)` 실행 → `postMessage`에 `varTypes` 동봉. 메인 스레드는 `rawTrace`를 다시 돌지 않음 (대형 trace에서도 UI 미세 프리징 방지).
- **직렬화 최적화 (`serialize`):** `__`로 시작하는 내부 속성·callable 제거. `deque` 전용 처리(list로 변환). 순환 참조는 `id(obj)` 추적으로 `"<circular>"` 대체. 깊이 3단계 초과 시 `"<TypeName (truncated)>"` 반환. 비직렬화 가능 타입은 `repr()` 폴백.
- **샌드박스 (`safe_builtins`):** `open`, `eval`, `exec`, `compile`, `__import__`, `globals`, `locals` 차단. 허용 목록(화이트리스트) 방식으로 알고리즘 필수 함수만 노출.

```python
# pyodide.worker.js 내부 동작 (사용자에게 노출되지 않음)
import sys, ast
from collections import deque

# ── 0. 샌드박스 보안: safe_builtins 화이트리스트 ────
# 허용: 알고리즘에 필요한 순수 함수만
_ALLOWED = {
    'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter',
    'sorted', 'reversed', 'int', 'float', 'str', 'bool', 'list',
    'dict', 'set', 'tuple', 'type', 'isinstance', 'min', 'max',
    'sum', 'abs', 'round', 'hash', 'id', 'repr',
}
# 차단: 파일 I/O, 코드 실행, 모듈 로드 등 시스템 접근 전체 제거
# vars() 사용 이유: Pyodide 환경에서 __builtins__는 dict가 아닌 module일 수 있음
safe_builtins = {k: v for k, v in vars(__builtins__).items() if k in _ALLOWED}

# ── 0-1. 직렬화 함수 ─────────────────────────
def serialize(obj, depth=0, memo=None):
    if memo is None:
        memo = set()
    # 기본 스칼라 타입: 그대로 반환
    if isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    # 순환 참조 감지
    if id(obj) in memo:
        return "<circular>"
    # 깊이 제한 (3단계 초과 시 타입명만 반환)
    if depth > 3:
        return f"<{type(obj).__name__} (truncated)>"
    memo.add(id(obj))
    # deque → list로 직렬화 (핵심 알고리즘 자료구조)
    if isinstance(obj, deque):
        return [serialize(i, depth + 1, memo) for i in obj]
    # 일반 리스트 / 튜플 / 집합
    if isinstance(obj, (list, tuple, set)):
        return [serialize(i, depth + 1, memo) for i in obj]
    # 딕셔너리: __ 시작 내부 속성 및 callable 제거
    if isinstance(obj, dict):
        return {
            str(k): serialize(v, depth + 1, memo)
            for k, v in obj.items()
            if not str(k).startswith('__') and not callable(v)
        }
    # 클래스 인스턴스 등 직렬화 불가 타입: repr 문자열로 폴백
    return repr(obj)

# ── 커스텀 예외 ──────────────────────────────
class StepLimitExceeded(Exception):
    pass

# ── 1. AST 분석: 루프/분기 줄 번호 사전 추출 ──
def find_branch_lines(code: str) -> dict:
    tree = ast.parse(code)
    result = {}
    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.While)):
            result[node.lineno] = "loop"
        elif isinstance(node, ast.If):
            result[node.lineno] = "branch"
    return result

# ── 2. 통합 tracer (scope + parent_frames 캐싱) ──
call_stack  = []          # 현재 콜 스택 (함수명)
frame_cache = {}          # {depth: 해당 깊이의 마지막 vars 스냅샷}
trace_log   = []
step_count  = 0
MAX_STEPS   = STEP_LIMIT  # 운영 설정값(N). 고정값 하드코딩 지양

def tracer(frame, event, arg):
    global step_count

    # 안전장치: 다음 이벤트가 무엇이든 즉시 중단
    if step_count >= MAX_STEPS:
        raise StepLimitExceeded("Step limit exceeded")

    if event == 'call':
        call_stack.append(frame.f_code.co_name)

    elif event == 'return':
        if call_stack:
            # 빠져나온 깊이의 캐시 정리 (stale 데이터 방지)
            exiting_depth = len(call_stack)
            frame_cache.pop(exiting_depth, None)
            call_stack.pop()

    elif event == 'line':
        current_depth = len(call_stack)
        current_vars  = serialize(dict(frame.f_locals))  # 직렬화 + 불필요 변수 제거

        # 현재 깊이 캐시 갱신
        frame_cache[current_depth] = current_vars

        # 부모 프레임 스냅샷 (현재보다 얕은 깊이만)
        parent_frames = {
            d: v for d, v in frame_cache.items()
            if d < current_depth
        }

        trace_log.append({
            "line": frame.f_lineno,
            "vars": current_vars,
            "scope": {
                "func":  call_stack[-1] if call_stack else "<global>",
                "depth": current_depth,
            },
            "parent_frames": parent_frames,   # 렌더러가 이전 프레임 흐릿하게 표시하는 데 사용
        })
        step_count += 1

    return tracer

# ── 3. 실행 ──────────────────────────────────
branch_lines = find_branch_lines(user_code)

sys.settrace(tracer)
try:
    exec(user_code, {"__builtins__": safe_builtins, "input": mocked_input})
except StepLimitExceeded as e:
    trace_log.append({"runtimeError": {"message": str(e), "type": "StepLimitExceeded", "line": None}})
except Exception as e:
    trace_log.append({"runtimeError": {"message": str(e), "type": type(e).__name__, "line": e.__traceback__.tb_lineno}})
finally:
    sys.settrace(None)

# ── 4. varTypes 합집합 (메인 스레드 순회 제거 — Worker에서만 수행) ──
def extract_var_types_union(trace_log: list) -> dict:
    """각 step의 vars를 순회, 변수명당 최초 등장 시 타입·형태 메타만 기록 (실제 값 제외)."""
    out = {}
    for step in trace_log:
        vd = step.get("vars")
        if not isinstance(vd, dict):
            continue
        for name, val in vd.items():
            if name in out or str(name).startswith("__"):
                continue
            out[name] = infer_var_meta(val)  # list2d shape, 1d len, 스칼라 등 — serialize 결과 기준
    return out

def infer_var_meta(val):
    """직렬화된 값 구조로 메타 추출 (deque는 list로 직렬화되므로 필요 시 AST/코드 힌트와 결합 가능)."""
    if isinstance(val, list):
        if val and isinstance(val[0], list):
            return {"type": "list2d", "shape": [len(val), len(val[0])]}
        return {"type": "list1d", "len": len(val)}
    if isinstance(val, (int, float, str, bool)) or val is None:
        return {"type": type(val).__name__}
    return {"type": type(val).__name__}

var_types = extract_var_types_union(trace_log)
# postMessage({type:'done', rawTrace: trace_log, branchLines: branch_lines, varTypes: var_types})
```

- **`input()` 목킹:** 사용자가 미리 입력한 stdin 값을 줄 단위 큐에 저장, `input()` 호출 시 순서대로 반환. 큐가 소진된 후 추가 `input()` 호출이 발생하면 **`EOFError`를 발생**시켜 `runtimeError` 흐름으로 처리. (Python 표준 동작과 동일, 사용자에게 "stdin 입력 부족" 메시지 전달)
- **AST 분석:** `ast.parse()`로 for/while/if 줄 번호를 사전 추출하여 `branchLines`로 반환. 타임라인 렌더러가 이 정보로 루프·분기 점(Dot)을 표시한다.

### B. AI 설명 생성 (Next.js API Route — 서버리스 함수)

AI API 키는 클라이언트에 노출되지 않도록 **Next.js API Route**(`/api/analyze`, `/api/explain`)에서만 호출한다. 클라이언트는 자체 서버리스 엔드포인트를 경유하여 AI와 통신한다.

```
클라이언트                    Next.js API Route              Gemini Flash
    │                               │                              │
    │── POST /api/analyze ─────────▶│── Gemini API call ──────────▶│
    │◀─ {strategy, key_vars, var_mapping, ...} ─│◀─ JSON response ─────────────│
    │                               │                              │
    │── POST /api/explain ─────────▶│── Gemini API call (stream) ─▶│
    │◀─ SSE stream ─────────────────│◀─ streaming response ─────────│
```

**AI 호출 구조 (2-Phase):**

```
Phase 1 — 분석 /api/analyze (1회 호출, ~1초)
  입력 1: 코드 전문 (정적 패턴 파악용)
  입력 2: varTypes — **Worker가** `trace_log` 전체를 순회해 만든 타입·형태 합집합 (클라이언트는 postMessage로 수신만)
           수집 규칙: 변수명당 **최초 등장** step의 타입·형태만 채택 (이후 동일 변수는 무시)
           예) { "grid":  {"type":"list2d","shape":[5,5],"dtype":"int"},
                 "q":     {"type":"list1d","len": 3},
                 "dist":  {"type":"int"} }
  이유: 코드 패턴(정적)과 실제 데이터 구조(동적)를 교차 검증하여 strategy 결정.
        합집합은 Worker에서만 계산 → 메인 스레드 이중 순회 없음.
        값이 아닌 타입·형태만 전송하여 입력 토큰 최소화.
  출력: {algorithm, strategy, key_vars[], var_mapping[], display_name}
        ※ display_name은 UI 상단 헤더에 표시: "현재 감지된 알고리즘: BFS"
        ※ var_mapping (핵심 변수 ↔ 실제 식별자 바인딩):
           [{ "role": "MAIN_QUEUE", "var_name": "q", "panel": "LINEAR" }, ...]
           - role: 시맨틱 역할 (예: MAIN_GRID, MAIN_QUEUE, GRAPH_ADJ, DIST_SCALAR)
           - var_name: **반드시** 코드·varTypes에 실제 존재하는 변수명 (예: `q = deque()` → "q")
             → AI가 개념명만 말하는 "queue"와 사용자 코드 불일치 방지
           - panel: HYBRID 등에서 GRID / LINEAR / GRAPH 중 어느 패널에 연결할지 (선택)
        ※ key_vars: 변수 모니터링 패널 강조용 요약. **시각화 패널에 값을 뿌릴 때는**
           `mergedTrace[i].vars[var_mapping[].var_name]` 접근을 우선한다.
  /api/analyze 시스템 프롬프트 보조 지시:
    - `var_mapping[].var_name`은 반드시 입력 `varTypes`의 키(실제 런타임 변수명) 중 하나여야 한다. 개념 라벨만 쓰지 말 것.

Phase 2 — 설명 /api/explain (청크 단위 순차 호출)
  입력: Snapshot + Delta 형식으로 20 step 묶음 + strategy (아래 참고)
        ※ 전송 전 각 step에서 parent_frames 필드 제거 (렌더러 전용, AI에게 불필요)
        ※ scope 필드는 유지 — AI가 재귀 깊이를 인지하여 "3번째 재귀 호출에서..." 같은
           정확한 설명 생성에 활용. 토큰 몇 바이트보다 설명 품질이 중요.
  출력: 각 step에 대한 {explanation, visual_actions, aiError} 배열
  → 마지막 chunk에 runtimeError 있으면 aiError(root_cause) 추가
  → SSE(Server-Sent Events)로 스트리밍 반환
  → 순차 호출 (청크 간 응답 순서 보장)

네트워크 에러 폴백 (데이터 탐색 모드):
  Phase 1 실패 → globalError = {type:'NETWORK', ...}
               → 토스트 "AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요."
               → rawTrace는 정상 저장, 재시도 버튼 표시
               → 재시도 시 /api/analyze만 재호출 (저장된 `code` + `varTypes`, rawTrace·Pyodide 재실행 불필요)
               → **Center Pane 폴백:** `metadata` 없이도 AI 시각화 대신 **기본 변수 테이블 뷰**
                 (`rawTrace[currentStep].vars`를 Key-Value 테이블로 표시 — 일반 디버거와 동일, AI 불필요)
  Phase 2 중간 실패 (청크 미수신) →
               → 해당 청크 이후 step은 EMPTY_ANNOTATED 패딩으로 mergedTrace 채움
               → toastError "AI 설명 연결에 실패했습니다. 변수 데이터만으로 탐색합니다."
               → 자동으로 '데이터 탐색 모드' 전환:
                  - Center Pane: GRID/LINEAR 등 **AI 시각화 대신 기본 Key-Value 테이블 뷰** 제공
                    (`mergedTrace[currentStep].vars` 전체 — 중첩 값은 접기/JSON 문자열 등 단순 표현)
                    상단에 짧은 안내: "AI 연결 실패 — 기본 변수 뷰로 추적 중입니다."
                  - 타임라인, 변수 모니터링 패널, Breadcrumb은 rawTrace·mergedTrace 기반으로 정상 작동
                  - Right Pane AI 설명 카드는 스켈레톤 없이 회색 "설명 없음" 텍스트 표시
```

**청크 전략으로 토큰 문제 해소 — Snapshot + Delta 방식:**

입력 토큰 폭발 방지를 위해 **각 청크의 첫 step만 전체 상태(Snapshot)를 보내고, 나머지 19개 step은 변경된 값(Delta)만 전송**한다.

```json
{
  "strategy": "HYBRID",
  "initial_state": {
    "grid": [
      [0, 1, 0],
      [1, 0, 1]
    ],
    "visited": [
      [false, false, false],
      [false, false, false]
    ],
    "queue": []
  },
  "steps": [
    {
      "line": 15,
      "scope": { "func": "bfs", "depth": 1 },
      "diff": {
        "visited": { "0,1": true },
        "queue": [
          [0, 1],
          [0, 2]
        ]
      }
    },
    {
      "line": 16,
      "scope": { "func": "bfs", "depth": 1 },
      "diff": {
        "dist": 5
      }
    }
  ]
}
```

> ※ `scope`는 매 step에 포함 — AI가 "3번째 재귀 호출에서..." 와 같이 깊이 기반 설명 생성에 활용

**Delta 표현 규칙:**
| 자료구조 타입 | 전송 방식 | 이유 |
|---|---|---|
| 2D 배열 (`grid`, `visited`) | 좌표 diff `{"r,c": value}` | 대형 배열 토큰 절감 |
| 1D 리스트·deque (`queue`, `stack`) | 전체 현재 값 | 짧고 append/pop 추적이 diff보다 명확 |
| 스칼라 (`dist`, `cnt`) | 새 값 그대로 | 단순 |

- 출력 토큰: 20 step × 설명 ≈ 항상 일정 범위
- 입력 토큰: Snapshot 1회 + Delta 19회 → 전체 전송 대비 대폭 절감
- 무료 모델(Gemini Flash)로 안정적으로 처리 가능

**AI 시스템 프롬프트 핵심 설계:**

```
역할: 너는 알고리즘 교육 전문가야.
입력: Python 코드의 실행 trace (라인 번호 + 변수 상태 + scope 배열) + 시각화 전략
출력 규칙:
  - 출력 배열의 길이는 입력 steps 배열의 길이와 반드시 1:1로 일치해야 한다
    (설명할 내용이 없는 step도 생략하지 말고 기본 구조를 갖춰 반환할 것)
  - 각 step에 대해 explanation (한국어, 20자 이내)
  - 각 step에 대해 visual_actions 배열 (action 이름 + params만. 색상/스타일 절대 포함 금지)
  - 에러 step이 있으면 반드시 "aiError" 키 아래에 root_cause를 담을 것
    (다른 키 이름 절대 사용 금지. 예: error, analysisError 등 사용 불가)
  - 에러 없는 step은 "aiError": null 으로 명시
  - 출력은 반드시 JSON 배열 형식
```

### C. 전략적 데이터 시각화 (Multi-Strategy Rendering)

Phase 1 분석 결과로 전략이 결정된다. 복합 자료구조 코드에는 **HYBRID** 전략으로 멀티 패널 구성.

**레이아웃 제약(핵심 원칙):**

- 실행 코드에서 사용된 핵심 데이터구조는 Center Pane 안에 **동시에 노출**되어야 한다. (예: `grid + queue + graph`)
- 사용자가 구조를 찾기 위해 페이지를 넘기지 않도록 **전역(페이지) 스크롤은 금지**한다.
- 시각화 패널은 화면 내 고정 영역에서 패널 분할/축약/밀도 조정으로 배치하며, **한눈에 전체 구조 상태를 확인**할 수 있어야 한다.

- **GRID 전략:** 2D 배열, 격자 탐색(BFS/DFS)용 셀 기반 하이라이트.
- **GRAPH 전략:** 트리, 그래프(최단 경로)용 노드-엣지 다이어그램.
- **LINEAR 전략:** 스택, 큐, 1차원 배열용 리스트 애니메이션.
- **HYBRID 전략:** 복합 자료구조(예: BFS = queue + grid 동시 사용)에서 Center Pane을 분할하여 두 전략 병렬 표시.

**시각화 전략 선택 기준 (Phase 1 AI 판단):**

| 코드 패턴                           | 전략   |
| ----------------------------------- | ------ |
| `graph[u].append(v)`, `visited[]`   | GRAPH  |
| `grid[][]`, `(r, c)` 좌표           | GRID   |
| `stack.append/pop`, `queue.popleft` | LINEAR |
| GRID + LINEAR 동시                  | HYBRID |

### D. 인터랙티브 디버깅 제어

- **Step-by-Step:** 전/후 단계 이동을 통해 데이터 변화 추적.
- **Break & Rewind:** 에러 발생 시점(Break)에서 실행 중단. 에러 이전 시점으로 자유롭게 복기(Rewind) 가능하며, 되감기 시 애니메이션 상태도 과거 시점 기준으로 역재생한다.
- **재생 컨트롤:** Auto-play 기본값(1초/step)을 제공하고, 사용자가 UI에서 배속을 자유롭게 조절할 수 있다.
- **실행 중 편집 제어:** 시뮬레이션 진행 중 에디터는 ReadOnly로 고정한다. 사용자는 디버깅 모드 종료 후 코드를 수정하고 다시 실행한다.
- **콘솔 동기화 Rewind:** `print()` 로그는 일반 터미널형 stdout으로 누적 표시하며, 이전 step으로 이동하면 콘솔 내용도 해당 시점까지 되감아 동기화한다.

### E. 스마트 변수 모니터링

- **스코프 자동 필터링:** 단순 인덱스 변수(`i`, `j`)와 핵심 자료구조를 분리하여 표시. (Phase 1의 `key_vars`로 강조, **시각화 데이터 소스는 `var_mapping[].var_name`** → `mergedTrace[i].vars[이름]`으로 조회)
- **값 변화 하이라이트:** 이전 단계 대비 변경된 변수 값에 애니메이션 효과 부여.
- **타입 인식 표시:** `list`는 인덱스 뷰, `dict`는 키-값 뷰, `set`은 집합 뷰로 각각 다르게 렌더링.

### F. 함수 스코프 및 재귀 처리 (Scope Management)

사용자가 함수를 호출하거나 재귀를 사용하면 콜 스택 구조가 생기며 변수들이 층층이 쌓인다. 단순히 하나로 뭉쳐 표시하면 혼란을 주므로 **Active Frame 강조 + Breadcrumb** 방식으로 처리한다.

> 구현 코드는 섹션 5-A 통합 tracer에 포함되어 있다. `call_stack`, `frame_cache`, `parent_frames` 수집이 모두 단일 tracer 함수 안에서 처리된다.

**UI 표현 규칙:**

| 상황                     | 변수 모니터링 패널 표시                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| 최상위 스코프            | Breadcrumb 없음 (또는 `<global>`)                                        |
| 일반 함수 호출           | Breadcrumb: `main > bfs`                                                 |
| 재귀 (depth ≥ 2)         | Breadcrumb: `bfs (depth: 3)`                                             |
| 재귀 중 이전 프레임 변수 | `parent_frames`에서 읽어 흐릿하게(opacity 낮춤) 표시                     |
| `return` 후 복귀         | `frame_cache`에서 해당 depth 제거 → 이전 프레임으로 Breadcrumb 자동 갱신 |

**프론트엔드 렌더링 로직:**

```ts
const step = mergedTrace[currentStepIdx];

// 현재 활성 프레임 (정상 표시)
renderVars(step.vars, { opacity: 1 });

// 부모 프레임들 (흐릿하게, depth 높은 것이 위)
Object.entries(step.parent_frames ?? {})
  .sort(([a], [b]) => Number(b) - Number(a))
  .forEach(([depth, vars]) => {
    renderVars(vars, { opacity: 0.35, label: `depth ${depth}` });
  });
```

- Breadcrumb, `parent_frames` 모두 `mergedTrace[i]`에서 직접 읽으므로 역방향 탐색 불필요.
- `frame_cache`의 return 시 depth 정리 덕분에 stale(복귀 후 잔류) 프레임이 표시되지 않는다.

### G. 지원 환경 제약 안내 (Environment Constraints)

`ModuleNotFoundError` 발생 시 사용자가 서비스 결함으로 오해하지 않도록 **사전 안내 + 에디터 인라인 경고**를 제공한다.

**공식 지원 패키지 목록 (알고리즘 필수 표준 라이브러리):**

```
collections  (deque, defaultdict, Counter, OrderedDict)
heapq, bisect, math, itertools, functools
sys, copy, re, string, random, typing
```

**사전 체크 로직 (실행 전 import 경고):**

- 코드 변경 시 `import` 구문을 정규식으로 파싱 → 지원 목록과 대조.
- 비지원 패키지 감지 시 Monaco Editor `editor.setModelMarkers()` API로:
  - 해당 라인에 **노란색 경고 밑줄**
  - 툴팁: `"이 패키지는 브라우저 환경(Pyodide)에서 지원되지 않습니다."`
- 에러 발생 후가 아닌 **실행 전에** 사용자가 인지할 수 있어 UX 크게 향상.

**UI 상시 안내 배치:**

- 에디터 하단 또는 Input Panel 옆에 고정 표시:
  `Python 3.11 표준 라이브러리 지원 · 외부 패키지(numpy, networkx 등) 미지원`

---

## 6. 상세 기술 명세

### A. Trace JSON 스키마

**Raw Trace** (Pyodide → 메인 스레드, via Web Worker `postMessage`)

`{ type: 'done', rawTrace, branchLines, varTypes }` — `varTypes`는 Worker가 `rawTrace`와 별도 필드로 동봉 (섹션 5-A 참고).

```json
{
  "rawTrace": [
    {
      "line": 12,
      "vars": {
        "queue": { "type": "deque", "value": [[0, 0]] },
        "visited": {
          "type": "list2d",
          "value": [
            [true, false],
            [false, false]
          ]
        },
        "dist": { "type": "int", "value": 3 }
      },
      "scope": {
        "func": "bfs",
        "depth": 1
      },
      "parent_frames": {
        "0": {
          "grid": {
            "type": "list2d",
            "value": [
              [0, 1],
              [1, 0]
            ]
          }
        }
      }
    }
  ],
  "branchLines": {
    "5": "loop",
    "10": "branch",
    "14": "branch"
  }
}
```

> `parent_frames`는 현재 depth보다 얕은 활성 프레임들의 vars 스냅샷이다. depth=0이 최상위. `return` 시 해당 depth가 `frame_cache`에서 삭제되므로 복귀 후에는 자동으로 사라진다.

**Annotated Trace** (AI → 클라이언트, via /api/explain, 청크 단위 SSE):

```json
[
  {
    "explanation": "시작점 (0,0)을 큐에 삽입",
    "visual_actions": [
      { "action": "focus", "panel": "GRID", "params": { "r": 0, "c": 0 } },
      { "action": "push", "panel": "LINEAR", "params": { "val": "[0,0]" } }
    ],
    "aiError": null
  }
]
```

> AI가 반환하는 Annotated Trace는 `line`과 `vars`를 포함하지 않는다. 인덱스 순서로 rawTrace와 1:1 대응하며, 클라이언트에서 병합한다. AI의 에러 분석은 `aiError` 키를 사용하여 rawTrace의 `runtimeError`와 충돌 없이 병합된다.

**Merged Trace** (클라이언트에서 생성, Zustand `mergedTrace` 저장):

AI 청크가 도착할 때마다 `rawTrace[i]`와 `annotated[i]`를 병합하여 `mergedTrace[i]`를 생성한다. 렌더러는 이 단일 배열만 참조한다.

```ts
// 병합 로직 (청크 도착 시 순차 실행)

// 1:1 대응 가드: AI 응답이 기대 길이보다 짧으면 빈 항목으로 패딩
const EMPTY_ANNOTATED = { explanation: '', visual_actions: [], aiError: null };
const normalized = Array.from(
  { length: rawChunk.length },
  (_, i) => annotatedChunk[i] ?? EMPTY_ANNOTATED,
);

normalized.forEach((annotated, i) => {
  const idx = chunkOffset + i;
  const raw = rawTrace[idx];
  mergedTrace[idx] = {
    ...raw, // vars, scope, parent_frames, runtimeError
    // runtimeError-only step(line/vars 없음) 대비 Lift-up — ...raw 뒤에 위치해야 덮어쓰기 적용됨
    // StepLimitExceeded는 runtimeError.line = null → 에디터 하이라이트 없음(정상)
    line: raw.line ?? raw.runtimeError?.line ?? null,
    ...annotated, // explanation, visual_actions, aiError
    // runtimeError(실제 예외) ↔ aiError(원인 분석) — 키가 달라 충돌 없음
  };
});
```

**에러 step 예시** (mergedTrace 기준):

```json
{
  "line": 17,
  "vars": { "i": 5, "grid": [[...]] },
  "scope": { "func": "bfs", "depth": 1 },
  "runtimeError": {
    "message": "list index out of range",
    "type": "IndexError",
    "line": 17
  },
  "explanation": "인덱스 범위 초과",
  "visual_actions": [
    {"action": "markError", "panel": "GRID", "params": {"r": 5, "c": 0}}
  ],
  "aiError": {
    "type": "IndexError",
    "root_cause": "grid의 행 크기(5)를 초과하는 인덱스(5)에 접근"
  }
}
```

> `runtimeError`: Pyodide가 실제로 잡은 예외 (팩트). `aiError`: AI가 원인을 분석한 해설 (해석). 두 필드는 독립적이므로 UI에서 별도 렌더링 가능.

### B. 시각화 원자적 명령 (Atomic Actions API)

모든 action은 `panel` 필드로 적용 패널을 지정한다. **색상·스타일은 action에 포함하지 않으며**, 렌더러의 디자인 시스템이 결정한다.

- **GRID:** `focus(r, c)`, `update(r, c, val)`, `markPath(coords[])`, `markVisited(r, c)`, `markError(r, c)`
- **GRAPH:** `visitNode(id)`, `edge(u, v, state)`, `updateNode(id, val)`, `highlightPath(ids[])`
- **LINEAR:** `push(val)`, `pop()`, `update(idx, val)`, `pointer(idx, name)`, `highlight(idx)`

### C. 콘솔 출력 모델 (Terminal-style stdout)

콘솔은 카드형 요약이 아니라 **일반 터미널 출력창**으로 동작한다.

- `print()`가 실행된 step에서 stdout 버퍼에 줄 단위로 append한다.
- 현재 step 인덱스 `i`의 콘솔은 `0..i` 구간에서 발생한 출력만 표시한다.
- Rewind/Back Step 시 stdout 버퍼도 동일 step 기준으로 되감아, 과거 시점 상태를 그대로 재현한다.
- Runtime error 발생 시 traceback 전체를 콘솔에 표시하며 에러 라인은 빨간색으로 렌더링한다.

---

## 7. UI/UX 레이아웃 구성

```
┌─────────────────┬──────────────────────┬─────────────────┐
│  Left Pane      │  Center Pane         │  Right Pane     │
│  (Editor)       │  (Visualizer)        │  (Info)         │
│                 │                      │                 │
│  Monaco Editor  │  GRID / GRAPH /      │  변수 모니터링   │
│  현재 줄 하이라이트  LINEAR / HYBRID   │  (key_vars 강조) │
│                 │  · 데이터 탐색 모드: │                 │
│                 │    K-V 테이블 폴백   │                 │
│                 │                      │  콘솔(터미널형) │
├─────────────────┴──────────────────────┴─────────────────┤
│  Input Panel: stdin 입력 (줄 단위 textarea), 실행 버튼    │
├───────────────────────────────────────────────────────────┤
│  Bottom (Timeline): 루프/분기 점(Dot) 표시 │
└───────────────────────────────────────────────────────────┘
```

**레이아웃 고정 규칙:**

- 앱 뷰포트는 `100vh` 기준 고정 레이아웃으로 구성하고, 페이지 루트 스크롤을 발생시키지 않는다.
- 복합 시각화(HYBRID 포함)에서도 Center Pane 내부에서 모든 핵심 구조를 동시에 보여주도록 패널 비율을 조정한다.
- 데이터가 커져도 "일부가 안 보이는 상태"를 허용하지 않으며, 구조별 표현 밀도(셀/노드 크기, 축약 라벨)를 자동 조정한다.

**로딩 UX 상태 흐름:**

| `pyodideStatus`             | UI 표시                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `loading`                   | 상단 배너: "Python 환경 준비 중..." · 실행 버튼 비활성화                                                     |
| `ready`                     | 실행 버튼 활성화                                                                                             |
| `running`                   | 에디터 위 프로그레스 바 + "실행 중..." · 실행 버튼 비활성화                                                  |
| `running` → AI 설명 생성 중 | (running 상태 유지) Step 카드 스켈레톤 → 설명이 스트리밍으로 채워짐                                          |
| step 에러 발생              | 자동 Break, 에디터 에러 라인 하이라이트 + Right Pane에 `runtimeError` + `aiError` 표시                       |
| step 이동/rewind            | 에디터·시각화·변수·콘솔(stdout)이 동일 step 기준으로 동기화                                                  |
| `reinitializing`            | 토스트 ⚠️ "실행 시간 초과, 환경을 재설정합니다." · 실행 버튼 [🔄 초기화 중...] 스피너                        |
| `ready` (재초기화 완료)     | 토스트 ✅ "환경 준비 완료. 코드를 수정 후 다시 시도해 주세요." · 실행 버튼 활성화                            |
| `error`                     | 상단 배너: "환경 초기화에 실패했습니다. 페이지를 새로고침해 주세요."                                         |
| NETWORK 에러 (AI 실패)      | 토스트 안내 · **Center = K-V 테이블 폴백** (AI 시각화 대체) · 변수 모니터링+타임라인 작동 (데이터 탐색 모드) |

---

## 8. MVP 범위 (대회 제출 기준)

| 기능                                                      | MVP 포함 | 비고                                                  |
| --------------------------------------------------------- | -------- | ----------------------------------------------------- |
| Python 코드 입력 (Monaco Editor)                          | ✅       |                                                       |
| stdin 입력 UI                                             | ✅       |                                                       |
| Pyodide Web Worker 실행 + sys.settrace                    | ✅       | 핵심                                                  |
| AI Phase 1 /api/analyze (전략·var_mapping·key_vars)       | ✅       |                                                       |
| AI Phase 2 /api/explain (설명 + visual_actions, 청크 SSE) | ✅       |                                                       |
| GRID 시각화                                               | ✅       | 데모: BFS 격자 탐색                                   |
| LINEAR 시각화                                             | ✅       | 데모: 스택/DFS                                        |
| GRAPH 시각화                                              | ✅       | 복합 자료구조 시각화 지원                             |
| HYBRID 멀티패널                                           | ✅       | Stack/Grid/Queue/Graph 동시 노출                      |
| Break & Rewind                                            | ✅       |                                                       |
| Auto-play + 속도 조절                                     | ✅       |                                                       |
| 타임라인 (루프/분기 Dot)                                  | ✅       | AST branchLines로 루프/분기 Dot 표시                  |
| 변수 모니터링 패널                                        | ✅       |                                                       |
| 함수 스코프 Breadcrumb                                    | ✅       | call/return 이벤트, depth 기반                        |
| UI 언어 토글 버튼 (KR/EN)                                 | 🔲       | 기획 확정, 구현 미포함                                |
| import 경고 (Monaco marker)                               | ✅       | 비지원 패키지 실행 전 인라인 경고                     |
| Pyodide 사전 로드 + 준비 완료 UX                          | ✅       |                                                       |
| 데이터 탐색 모드 K-V 테이블 폴백                          | ✅       | AI 실패 시 Center에 기본 디버거 뷰 (`vars` Key-Value) |

**데모 시나리오 (심사 기준):**

1. BFS(격자 탐색) 코드 + 입력값 → GRID 시각화로 탐색 경로 시각화
2. 의도적으로 인덱스 에러 있는 코드 → 에러 step에서 Break + AI의 root_cause 표시

---

## 9. 기술 스택 (Tech Stack)

- **Frontend:** Next.js, Tailwind CSS, Zustand (상태 관리)
- **실행 엔진:** Pyodide (WebAssembly 기반 브라우저 내 Python 런타임, Web Worker 내 실행)
- **Library:** React Flow (Graph), Framer Motion (Animation), Monaco Editor
- **AI 연동:** Next.js API Route (`/api/analyze`, `/api/explain`) — API 키 서버 환경변수에 보관
- **AI 모델:** Gemini 1.5 Flash (무료 티어, JSON Mode + SSE 스트리밍)
- **AI 백업:** GPT-4o-mini (Gemini 장애 시 fallback)

**전역 에러 타입 정의:**

```ts
// 개별 step 에러(runtimeError, aiError)와 달리, 시각화 자체를 시작할 수 없는 시스템 에러
interface TraceError {
  type: 'TIMEOUT' | 'NETWORK' | 'RUNTIME';
  message: string;
}
// TIMEOUT  — 실행 5초 초과 후 worker.terminate()
// NETWORK  — /api/analyze 또는 /api/explain 호출 실패
// RUNTIME  — Pyodide 로드 실패 등 초기화 에러
```

**Zustand 상태 구조:**

```ts
{
  code: string,
  stdin: string,
  pyodideStatus: 'loading' | 'ready' | 'running' | 'reinitializing' | 'error',
                          // loading        → 초기 진입 시 (상단 배너, 실행 버튼 비활성)
                          // ready          → 실행 버튼 활성화
                          // running        → Worker 실행 중 + AI 설명 스트리밍 중 (실행 버튼 비활성)
                          // reinitializing → timeout 후 재로드 중 (스피너)
                          // error          → Pyodide 로드 실패 (새로고침 배너)
  rawTrace: RawTraceStep[],       // Step 1: Pyodide 출력 (원본 보존, scope 포함)
  branchLines: Record<number, 'loop' | 'branch'>, // AST 분석 결과
  varTypes: Record<string, unknown> | null, // Worker가 전달한 타입·형태 합집합 (Phase 1·재시도 입력)
  mergedTrace: MergedStep[],      // rawTrace + annotatedTrace 병합 배열 (렌더러 참조)
  metadata: {
    algorithm: string;
    strategy: 'GRID' | 'GRAPH' | 'LINEAR' | 'HYBRID';
    key_vars: string[];
    var_mapping: { role: string; var_name: string; panel?: 'GRID' | 'LINEAR' | 'GRAPH' }[];
    display_name: string;
  } | null,                       // Phase 1 완료 전은 null
  currentStep: number,
  isPlaying: boolean,
  playbackSpeed: number,          // 0.5 | 1.0 | 1.5 | 2.0
  globalError: TraceError | null, // 시스템 수준 에러 (개별 step 에러와 구분)
}
```

> `annotatedTrace`는 별도 저장하지 않는다. AI 청크 도착 시 즉시 `mergedTrace`로 병합하여 렌더러가 단일 배열만 참조하도록 한다.

---

## 10. 향후 확장 계획

1. **GRAPH / HYBRID 고도화:** Dijkstra, 트리 재구성 등 고급 시나리오 품질 개선.
2. **Edge Case 생성기:** AI가 사용자의 코드를 터뜨릴 수 있는 극한의 입력값(Test Case)을 자동 생성.
3. **코드 최적화 제안:** 시간/메모리 초과 감지 시 AI가 더 효율적인 알고리즘으로의 리팩토링 가이드 제공.
4. **JS/Java 지원:** 각 언어의 브라우저 실행 환경(QuickJS 등) 도입.
5. **대형 trace 전송 최적화 (성능 병목 시):** Worker 내부에서 step 간 **Delta 방식**으로 변경분만 기록하거나, `parent_frames` 전체 복사 대신 참조·공유 구조로 줄여 `postMessage` 페이로드와 직렬화 비용을 절감. (MVP는 전량 스냅샷 + `serialize` 깊이 제한으로 충분; 프로파일링 후 도입)
6. **Call Stack 미니 트리 비주얼:** `scope.depth`·함수명을 활용해 상단에 얕은 호출 스택 트리(또는 단계형 인디케이터)를 표시. 재귀/DFS 학습 시 "현재 몇 번째 호출인지"를 Breadcrumb 텍스트만으로 보는 것보다 직관적으로 전달.

---

## 11. QA 기준 확정 정책 (docs/qa-questions.tsv 반영)

### A. 입력/분석 정책

- 코드 길이는 사실상 자유 입력을 보장하되, 가이드 상한은 약 300줄로 둔다.
- PS 문제 지문 없이 코드만 입력해도 시뮬레이션을 진행한다.
- 테스트 케이스(stdin)는 사용자가 직접 입력한다.
- 문법 에러는 입력 단계에서 즉시 표시(빨간 밑줄)하고, 실행 시도 시에도 동일 에러를 즉시 안내한다. (런타임 시뮬레이션 시작 전 차단)

### B. 시각화/디버깅 정책

- AI가 선택한 시각화 전략은 사용자 수동 변경 기능 없이 고정한다.
- 하나의 코드에서 자료구조가 혼용되면 복수 패널을 동시에 렌더링한다.
- 대규모 데이터는 한 화면 가독성을 우선하여 데이터 크기 상한으로 제어한다.
- 화면 전체(페이지) 스크롤 없이, 렌더링 영역에서 모든 핵심 데이터구조를 한눈에 확인 가능해야 한다.
- Back Step은 값 복구를 넘어 과거 애니메이션 상태까지 역재생한다.
- 에러 탐색은 에디터의 에러 라인 하이라이트를 기본으로 하며, 타임라인 클릭 이동 기능은 제공하지 않는다.
- 콘솔은 `print()` 기준의 터미널형 stdout 누적 뷰를 사용하며, step 이동 시 과거 상태로 함께 되감긴다.

### C. 에러/안내 정책

- 에러 원인 분석은 제공하되, 수정 코드 제안/코드 생성형 가이드는 제공하지 않는다.
- 에러 없이 종료되었으나 출력이 기대와 다른 경우(로직 오류)는 별도 자동 판정하지 않는다.
- AI 설명은 보조 정보이며, 추가 문답형 상호작용 기능은 제공하지 않는다.

### D. 서비스 운영 정책

- 모바일/태블릿은 비지원, 데스크탑 전용으로 운영한다.
- 로그인 없이 게스트로 사용 가능하게 설계한다.
- 비즈니스 모델은 현 단계에서 무료 운영을 기본으로 한다.
- 튜토리얼/온보딩 플로우는 후순위로 둔다.
- 디버깅 세션 히스토리/공유/Export 기능은 현 범위에서 제공하지 않는다.

### E. 언어/브랜딩 정책

- 공식 브랜드명은 `Frogger`를 사용한다.
- UI 언어는 한국어/영어 지원을 목표로 하며 i18n 적용을 전제로 설계한다.
- 헤더 우측에 `KR/EN` 토글 버튼을 제공한다. (기획 확정, 현재 미구현)
- 언어 확장은 Python 우선 후 JavaScript, Java, C++ 순으로 검토한다.
