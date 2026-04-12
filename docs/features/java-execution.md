# Java 실행 파이프라인

## 전체 흐름

```
[page.tsx]
  → ProvaRuntime.run(code, stdin)      # lang().java → runRemote()
  → fetch /api/java/execute (JSON)
  → javaInstrument(code)               # 소스 레벨 계측 삽입
  → Java 실행 서버 (raw code POST)
  → { stdout, stderr, exitCode }
  → parseJavaTrace(stderr, stdout)     # WorkerDonePayload 재구성
  → onDone(payload)                    # 기존 merge/store/시각화 재사용
```

Python worker의 `sys.settrace`, JS worker의 Acorn 계측과 동일한 원리.  
트레이스는 **stderr**로 출력, 사용자 stdout은 분리 수집한다.

---

## 1. 서버 수정 (`app.py`, `run.sh`)

### 1.1 `app.py` — JSON 요청·응답으로 변경

```python
from flask import Flask, request, Response
import os
import subprocess
import json
import tempfile

app = Flask(__name__)

SERVICE_TOKEN = os.getenv("JAVA_EXECUTION_SERVICE_TOKEN")

MAX_CODE_BYTES  = 50_000
MAX_STDIN_BYTES = 10_000


def _auth_error():
    if not SERVICE_TOKEN:
        return Response(json.dumps({"error": "Server token is not configured"}),
                        status=500, mimetype="application/json")
    if request.headers.get("Authorization", "") != f"Bearer {SERVICE_TOKEN}":
        return Response(json.dumps({"error": "Unauthorized"}),
                        status=401, mimetype="application/json")
    return None


def _json(data, status=200):
    return Response(json.dumps(data), status=status, mimetype="application/json")


@app.post("/run")
def run():
    err = _auth_error()
    if err:
        return err

    body       = request.get_json(silent=True) or {}
    code       = body.get("code", "")
    stdin_data = body.get("stdin", "") or ""

    if not isinstance(code, str) or not code.strip():
        return _json({"error": "Empty source code"}, status=400)
    if len(code.encode()) > MAX_CODE_BYTES:
        return _json({"error": "Code too large"}, status=413)
    if len(stdin_data.encode()) > MAX_STDIN_BYTES:
        return _json({"error": "stdin too large"}, status=413)

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".java", delete=False, encoding="utf-8")
    try:
        tmp.write(code)
        tmp.flush()
        tmp.close()

        p = subprocess.run(
            ["./run.sh", tmp.name],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return _json({"stdout": p.stdout, "stderr": p.stderr, "exitCode": p.returncode})

    except subprocess.TimeoutExpired:
        return _json({"error": "Execution timed out"}, status=408)
    except Exception as e:
        return _json({"error": str(e)}, status=500)
    finally:
        os.unlink(tmp.name)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

**변경 포인트**
- 요청: raw 코드 텍스트 → `{ code, stdin }` JSON
- 응답: plain text stdout → `{ stdout, stderr, exitCode }` JSON, 모든 에러도 JSON 통일
- 입력 검증: 코드 50KB, stdin 10KB 상한
- 임시 파일 정리: `finally` 블록에서 항상 `os.unlink()`

### 1.2 `run.sh` — 파일 경로 인자 + JVM 옵션 추가

```bash
#!/bin/bash
set -eu

JAVA_FILE=${1:?"Usage: run.sh <source_file>"}

WORKDIR=$(mktemp -d)
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

cd "$WORKDIR"
cp "$JAVA_FILE" Main.java

if ! timeout 5s javac -encoding UTF-8 -J-Xmx256m Main.java; then
    exit 1
fi

timeout 5s java -cp . -Xmx256m -Xss8m Main
```

**변경 포인트**
- `cat > Main.java` (stdin 소비) → `cp "$JAVA_FILE" Main.java` → stdin이 Java 프로그램에 상속
- `javac -encoding UTF-8`: 한글 포함 코드 안전 처리
- `java -Xmx256m -Xss8m`: 힙 상한(OOM 방지) + 스택 크기(깊은 재귀 허용)

---

## 2. 클라이언트 변경

### 2.1 `app/api/java/execute/route.ts` — 요청/응답 포맷 변경

```typescript
// 변경 전: JSON { code, stdin, limits } → upstream JSON 그대로 반환
// 변경 후: 계측 → raw code 전송 → trace 파싱 → WorkerDonePayload 반환

import { instrumentJavaCode } from "@/lib/javaInstrument";
import { parseJavaTrace }      from "@/lib/javaTraceParser";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, stdin, limits } = body;

  // ... 기존 입력 검증 ...

  const instrumented = instrumentJavaCode(code);  // 계측 삽입

  const upstream = await fetch(serviceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(serviceToken ? { Authorization: `Bearer ${serviceToken}` } : {}),
    },
    body: JSON.stringify({ code: instrumented, stdin }),
    signal: req.signal,
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    return NextResponse.json(
      { error: err?.error ?? `Java 실행 실패 (${upstream.status})` },
      { status: upstream.status }
    );
  }

  const { stdout, stderr, exitCode } = await upstream.json();

  // 컴파일 에러: exitCode != 0 + stderr에 javac 에러 메시지
  if (exitCode !== 0 && !stderr.includes("{\"step\":")) {
    return NextResponse.json({ error: stderr || "컴파일 오류" }, { status: 400 });
  }

  // stderr = 트레이스 JSON 라인들, stdout = 사용자 출력
  const payload = parseJavaTrace(stderr, stdout, limits);
  return NextResponse.json(payload);
}
```

### 2.2 `src/lib/javaInstrument.ts` — 신규

소스 레벨 계측. 사용자 코드에 아래 헬퍼를 주입하고, 각 statement 뒤에 `__t()` 호출을 삽입한다.

**주입되는 헬퍼 (클래스 상단)**

```java
static int __step = 0;

static String __s(Object o) {
    if (o == null)                return "null";
    if (o instanceof int[])       return java.util.Arrays.toString((int[])   o);
    if (o instanceof long[])      return java.util.Arrays.toString((long[])  o);
    if (o instanceof double[])    return java.util.Arrays.toString((double[]) o);
    if (o instanceof boolean[])   return java.util.Arrays.toString((boolean[])o);
    if (o instanceof int[][])     return java.util.Arrays.deepToString((int[][])  o);
    if (o instanceof Object[])    return java.util.Arrays.deepToString((Object[]) o);
    if (o instanceof String)      return "\"" + ((String)o)
                                        .replace("\\","\\\\").replace("\"","\\\"") + "\"";
    return String.valueOf(o);
}

static void __t(int line, Object... kv) {
    StringBuilder sb = new StringBuilder();
    sb.append("{\"step\":").append(__step++)
      .append(",\"line\":").append(line)
      .append(",\"vars\":{");
    for (int i = 0; i + 1 < kv.length; i += 2) {
        if (i > 0) sb.append(",");
        sb.append("\"").append(kv[i]).append("\":").append(__s(kv[i + 1]));
    }
    sb.append("}}");
    System.err.println(sb);   // stderr → route.ts에서 분리 파싱
}
```

**계측 삽입 규칙**

| 패턴 | 삽입 위치 | 전달 변수 |
|------|----------|----------|
| `int x = 5;` | 선언문 바로 뒤 | 현재 스코프 내 모든 지역변수 |
| `x = expr;` | 대입문 바로 뒤 | 동일 |
| `arr[i] = expr;` | 배열 대입 바로 뒤 | 동일 |
| `for (int i = ...) {` | 반복 헤더 뒤 (루프 진입) | 동일 |
| `while (cond) {` | 루프 진입 직후 | 동일 |

**구현 접근법**: 전체 Java AST 파서 없이 라인별 정규식으로 처리.  
MVP에서 커버하는 패턴: 기본형(`int`, `long`, `double`, `boolean`, `char`), `String`,  
1D/2D 배열(`int[]`, `int[][]`), `ArrayList`, `HashMap` — 알고리즘 문제 99%에 해당.  
처리하기 어려운 패턴(람다, 중첩 클래스 등)은 해당 라인 계측을 건너뛰고 무시한다.

### 2.3 `src/lib/javaTraceParser.ts` — 신규

```typescript
// 입력
//   traceOutput: stderr (한 줄 = JSON step)
//   userOutput:  stdout (사용자 print 출력)
// 출력: WorkerDonePayload

export function parseJavaTrace(
  traceOutput: string,
  userOutput: string,
  limits?: { maxTraceSteps?: number; ... }
): WorkerDonePayload {
  const rawTrace: RawTraceStep[] = [];
  const stdoutLines = userOutput.split("\n").filter(Boolean);

  for (const line of traceOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;

    try {
      const { step, line: ln, vars } = JSON.parse(trimmed);
      rawTrace.push({
        step,
        line: ln,
        vars,
        scope: { func: "main", depth: 0 },
        parent_frames: [],
        stdout: [],
        runtimeError: null,
      });
    } catch { /* 파싱 실패 라인 무시 */ }

    if (limits?.maxTraceSteps && rawTrace.length >= limits.maxTraceSteps) break;
  }

  // 마지막 step에 stdout 전체 붙이기 (Python worker와 동일 방식)
  if (rawTrace.length > 0) {
    rawTrace[rawTrace.length - 1].stdout = stdoutLines;
  }

  const varTypes = extractVarTypesUnion(rawTrace);
  const branchLines = inferBranchLines(rawTrace);

  return { rawTrace, branchLines, varTypes };
}
```

---

## 3. 데이터 흐름 요약

```
app.py 수신: { code: "<계측된 코드>", stdin: "..." }
           ↓
run.sh: javac + java (stdin 상속)
           ↓
stdout: 사용자 출력 ("Hello World", "42" 등)
stderr: 트레이스 라인들
  {"step":0,"line":3,"vars":{"x":5}}
  {"step":1,"line":4,"vars":{"x":5,"arr":[1,2,3]}}
  ...
           ↓
route.ts: { stdout, stderr, exitCode } 수신
           ↓
parseJavaTrace(stderr, stdout)
           ↓
WorkerDonePayload { rawTrace, branchLines, varTypes }
           ↓
기존 mergeTrace → 시각화 (변경 없음)
```

---

## 4. 에러 케이스 처리

| 상황 | 서버 반환 | route.ts 처리 |
|------|----------|--------------|
| 컴파일 에러 | exitCode≠0, stderr에 javac 메시지 | `{ error: stderr }` 400 반환 |
| 런타임 예외 | exitCode≠0, stderr에 Exception + trace 혼재 | trace 파싱 후 `runtimeError` 마지막 step에 기록 |
| 타임아웃 | app.py 408 | `onTimeout()` 콜백 |
| 정상 | exitCode=0 | WorkerDonePayload 반환 |

---

## 5. 제약 사항 (MVP)

- **단일 파일, `public class Main`** 고정
- **stdin 지원**: `Scanner(System.in)` 사용 가능 (`app.py`가 stdin 전달)
- **변수 직렬화**: 기본형, String, 1D/2D 배열, ArrayList, HashMap 지원. 임의 객체 그래프는 `toString()` 폴백
- **람다·익명 클래스 내부 변수**: 계측 건너뜀 (오류 없이 무시)
- **다중 메서드**: MVP는 `main()` 스코프 위주, 메서드 진입/리턴 이벤트는 추후 확장
