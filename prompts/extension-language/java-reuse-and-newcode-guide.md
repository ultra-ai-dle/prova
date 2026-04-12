# Java 도입: 재사용 vs 신규 작성 가이드

> `java-introduction-plan.md`의 아키텍처를 기반으로,  
> **현재 코드베이스에서 그대로 쓸 수 있는 것과 새로 작성해야 하는 것**을 예시 코드와 함께 정리합니다.

---

## 1. 전체 구조 요약

```
┌─────────────────────────────────────────────────────────┐
│                     재사용 가능 (변경 없음)                 │
│  RawTraceStep 타입 · 시각화 컴포넌트 · useProvaStore       │
│  trace/merge.ts · BranchLines · AnalyzeMetadata 타입      │
└─────────────────────────────────────────────────────────┘
         ↑ 동일 스키마 { rawTrace, varTypes, branchLines }
┌─────────────────────────────────────────────────────────┐
│                   수정 필요 (일부 변경)                     │
│  ProvaRuntime · page.tsx · /api/analyze                  │
└─────────────────────────────────────────────────────────┘
         ↑ 새 백엔드 호출 / Java 힌트 추가
┌─────────────────────────────────────────────────────────┐
│                   신규 작성 (없던 것)                       │
│  ExecutionBackend 추상화 · RemoteJavaBackend              │
│  Java 실행 서비스 (JVM + 트레이서 + 직렬화)                  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 재사용 가능한 것 (변경 없음)

### 2.1 타입 계약 — `src/types/prova.ts`

아래 인터페이스는 언어와 무관하게 설계되어 있으므로 **Java도 동일 스키마를 출력**하면 그대로 사용됩니다.

```typescript
// src/types/prova.ts — 현재 코드 그대로

export interface RawTraceStep {
  step: number;
  line: number;                         // Java 소스 라인 번호
  vars: Record<string, unknown>;        // {"n": 5, "arr": [1,2,3], ...}
  scope: ScopeInfo;                     // { func: "main", depth: 0 }
  parent_frames: ParentFrame[];         // 콜스택
  stdout?: string[];                    // System.out 출력
  runtimeError: RuntimeErrorInfo | null;
}

export interface WorkerDonePayload {   // Java 응답도 이 모양이어야 함
  rawTrace: RawTraceStep[];
  branchLines: BranchLines;
  varTypes: Record<string, string>;    // { "arr": "list", "n": "int", ... }
}
```

### 2.2 시각화 컴포넌트

`rawTrace`만 올바르게 들어오면 아래 컴포넌트는 **코드 수정 없이** Java 트레이스를 렌더링합니다.

| 컴포넌트 | 경로 |
|---|---|
| GridLinearPanel | `src/features/visualization/GridLinearPanel.tsx` |
| GraphPanel | `src/features/visualization/GraphPanel.tsx` |
| VariablesPanel | `src/features/visualization/VariablesPanel.tsx` |
| Timeline / Playback | `src/features/visualization/Timeline.tsx` 등 |

### 2.3 상태 관리 — `src/store/useProvaStore.ts`

`setWorkerResult(payload)` 호출 이후 로직은 전부 언어 무관입니다.

### 2.4 Trace merge — `src/features/trace/merge.ts`

`mergeTrace(rawTrace, analyzeMetadata)` 함수는 타입만 맞으면 동작합니다.

---

## 3. 수정이 필요한 것

### 3.1 `src/features/execution/runtime.ts` — 핵심 변경

**현재 코드의 문제점**: `workerUrl()`이 Python/JS Worker URL만 반환하고, Java용 원격 HTTP 경로가 없습니다.

```typescript
// 현재 (runtime.ts:60-64)
private workerUrl(): string {
  const version = encodeURIComponent(provaRuntimeConfig.workerScriptVersion);
  if (this.language === "javascript") return `/worker/js.worker.js?v=${version}`;
  return `/worker/pyodide.worker.js?v=${version}`;
  // ❌ Java가 오면 pyodide worker로 fallback됨
}
```

**변경 방향**: `ExecutionBackend` 인터페이스를 추출하고 `ProvaRuntime`은 언어에 맞는 backend를 선택하도록 수정합니다.

```typescript
// src/features/execution/backend.ts (신규)
export interface ExecutionBackend {
  init(): void;
  run(code: string, stdin: string): void;
  destroy(): void;
}
```

```typescript
// src/features/execution/runtime.ts (수정 후)
import { LocalWorkerBackend } from "./LocalWorkerBackend";
import { RemoteJavaBackend } from "./RemoteJavaBackend";

export class ProvaRuntime {
  private backend: ExecutionBackend;

  constructor(callbacks: RuntimeCallbacks, language: string = "python") {
    if (language === "java") {
      this.backend = new RemoteJavaBackend(callbacks);
    } else {
      this.backend = new LocalWorkerBackend(callbacks, language);
    }
  }

  init()                          { this.backend.init(); }
  run(code: string, stdin: string){ this.backend.run(code, stdin); }
  destroy()                       { this.backend.destroy(); }
}
```

```typescript
// src/features/execution/LocalWorkerBackend.ts (신규 — 현재 runtime.ts에서 분리)
export class LocalWorkerBackend implements ExecutionBackend {
  private worker: Worker | null = null;

  constructor(
    private callbacks: RuntimeCallbacks,
    private language: string
  ) {}

  init() { this.createWorker(); }

  run(code: string, stdin: string) {
    if (this.language === "python" && stdin.trim().length === 0) {
      this.callbacks.onInvalidInput("예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.");
      return;
    }
    this.worker?.postMessage({ code, stdin, limits: { /* ... */ } });
  }

  // createWorker() 등 기존 로직을 그대로 이관
}
```

### 3.2 `app/page.tsx` — 언어 선택 및 stdin 처리

**현재**: Java 옵션이 `disabled`로 선언되어 있습니다 (page.tsx:978).

```tsx
// 현재 (page.tsx:976-983)
<option value="java" disabled>
  Java (준비중)
</option>
```

**변경할 것**:

```tsx
// 1. disabled 제거
<option value="java">Java</option>

// 2. 파일명 레이블 (page.tsx:957)
// 현재
{language === "javascript" ? "algorithm.js" : "algorithm.py"}
// 변경
{language === "javascript" ? "algorithm.js"
  : language === "java" ? "Algorithm.java"
  : "algorithm.py"}

// 3. stdin 안내 문구
// collectUserDeclaredSymbols(page.tsx:263) 에 Java 선언 패턴 추가 필요
// 예: int n, String[] args, for (int i = ...) 등
```

**`isRuntimeNoiseVar` Java 필터 추가** (page.tsx:231):

```typescript
function isRuntimeNoiseVar(name: string, value: unknown, language = "python") {
  // ... 기존 로직 ...
  if (language === "java") {
    // JVM 내부 변수 필터
    if (["this", "args", "serialVersionUID"].includes(name)) return true;
    if (name.startsWith("$")) return true; // 바이트코드 계측 삽입 변수
    return false;
  }
  // ...
}
```

### 3.3 `app/api/analyze/route.ts` — Java 프롬프트 힌트

**현재**: `isJs` 분기만 있고 Java 분기가 없습니다 (route.ts:508).

> **주의**: `code-quality.md` 규칙에 따라 언어 비교는 `is()` 유틸리티와 `switch`를 사용합니다.

#### 언어 힌트 (switch로 작성)

```typescript
// app/api/analyze/route.ts — analyzeWithAi() 내부
let langLabel: string;
let langSpecificHints: string[];
switch (language) {
  case "javascript":
    langLabel = "JavaScript";
    langSpecificHints = [ /* 기존 JS 힌트 */ ];
    break;
  case "java":
    langLabel = "Java";
    langSpecificHints = [
      // ── varTypes 직렬화 매핑 (타입 자체가 역할을 결정하는 경우만) ──
      // ArrayList/LinkedList: 항상 1D 선형 컬렉션 → "list"
      "Java: ArrayList·LinkedList → varTypes='list'. ArrayDeque는 offer/poll 패턴이면 'queue', push/pop 패턴이면 'stack'. PriorityQueue → 'heap'. HashMap·TreeMap → 'dict'. HashSet → 'set'. int[] → 'list'.",
      // ── 핵심: 타입이 아닌 역할로 판단 ────────────────────────────────
      // int[][]는 타입만으로 전략을 결정할 수 없다. 사용 패턴을 보라.
      "Java 핵심: int[][] 타입만으로 strategy를 결정하지 말 것. 반드시 코드에서 어떻게 쓰이는지를 보라 — board[y][x] 타일 격자·BFS/DFS 이동이면 GRID(varType='list2d'), graph[u][v] 정점-정점 비용·연결이면 GRAPH(graph_representation=GRID), dp[i][j] 부분문제 최적값이면 GRID.",
      // ── GRID 맵 vs GRAPH ────────────────────────────────────────────
      // board 변수가 셀 격자로 쓰이고 방향벡터로 4방향 이동하면 GRID
      "Java: int[][] 변수가 셀 격자로 쓰이고 방향벡터 배열로 BFS·DFS·4방향 이동을 하면 strategy=GRID/GRID_LINEAR. graph_var_name을 비우고 해당 변수를 GRAPH 패널에 두지 말 것.",
      // 방향벡터 자체는 정적 보조 변수
      "Java: int[][] dirs = {{1,0},{-1,0},...} 처럼 고정 방향 오프셋 배열은 정적 보조 변수다 — var_mapping panel=VARIABLES, GRID 셀로 펼치지 말 것.",
      // ── linear_pivots — 이름이 아닌 사용 패턴으로 판단 ──────────────
      // 변수 이름(left/right/lo/hi 등)은 근거가 되지 않는다
      "Java linear_pivots: 두 int 변수가 동일 배열의 양 끝(또는 구간 경계)에서 서로 수렴·확장하며 원소에 접근하는 패턴 → 투포인터. 변수 이름이 아닌 사용 패턴으로만 판단하고, linear_pivots에 각각 pivot_mode='index', indexes_1d_var=해당 배열명을 추가.",
      // 퀵소트 피벗: 배열 원소 값을 대입받아 partition 기준으로 쓰이는 변수
      "Java linear_pivots: int 변수에 배열의 특정 원소 값을 대입하고 그 값을 기준으로 원소를 교환·분할하는 패턴 → 퀵소트 피벗. pivot_mode='value_in_array', indexes_1d_var=해당 배열명. 변수명 pivot 여부와 무관하게 사용 패턴만으로 결정.",
      // ── 기타 Java 문법 특성 ──────────────────────────────────────────
      "Java: static 메서드는 함수와 동일하게 취급, this.field는 지역변수와 구분.",
    ];
    break;
  default:
    langLabel = "Python";
    langSpecificHints = [ /* 기존 Python 힌트 */ ];
}
```

#### fallback 패턴 — `src/lib/javaFallbackHints.ts` (신규)

> **규칙**: `route.ts`에 직접 regex를 두지 않는다 (`partitionPivotEnrichment.ts` 패턴과 동일).  
> fallback 탐지 로직은 `src/lib/javaFallbackHints.ts`로 분리하고 `route.ts`에서 호출한다.

```typescript
// src/lib/javaFallbackHints.ts (신규)
interface JavaPatternResult {
  tags: string[];
  detected_data_structures: string[];
  detected_algorithms: string[];
}

export function detectJavaPatterns(code: string): JavaPatternResult | null {
  const hasStackOps = /\.push\s*\(|\.pop\s*\(\s*\)/.test(code);
  const hasQueueOps = /\.offer\s*\(|\.poll\s*\(\s*\)/.test(code);
  const hasDfs      = /\bdfs\b|\bDFS\b|Stack<|새로운 스택/.test(code);
  const hasBfs      = /\bbfs\b|\bBFS\b|Queue<|Deque</.test(code);

  if (hasDfs || hasStackOps)
    return { tags: ["dfs"],   detected_data_structures: ["stack"], detected_algorithms: ["dfs"] };
  if (hasBfs || hasQueueOps)
    return { tags: ["bfs"],   detected_data_structures: ["queue"], detected_algorithms: ["bfs"] };

  return null; // 패턴 없음 — fallback 기본값 유지
}
```

```typescript
// app/api/analyze/route.ts — fallbackAnalyzeMetadata() 내부
import { detectJavaPatterns } from "@/lib/javaFallbackHints";

if (is(language).java && code) {
  const javaResult = detectJavaPatterns(code);
  if (javaResult) {
    tags                    = javaResult.tags;
    detected_data_structures = javaResult.detected_data_structures;
    detected_algorithms     = javaResult.detected_algorithms;
  }
}
```

#### 연동 주의사항 (cursor rule)

분류·시각화 규칙 변경 시 아래 4곳을 함께 맞춰야 합니다.

| 파일 | 확인 내용 |
|---|---|
| `app/api/analyze/route.ts` | `langSpecificHints` switch 케이스 |
| `app/api/analyze/route.ts` | `ANALYZE_GEMINI_SCHEMA` — Java 관련 enum/필드 확장 필요 시 |
| `src/types/prova.ts` | `LinearPivotSpec` — Java 전용 pivot 패턴 추가 시 |
| `src/features/visualization/linearPointerHelpers.ts` | `pointersAtIndexFromSpecs` — Java 타입 처리 필요 시 |

---

## 4. 신규 작성이 필요한 것

### 4.1 `RemoteJavaBackend` — 클라이언트 측

Web Worker 대신 HTTP/SSE로 Java 실행 서비스를 호출합니다.

```typescript
// src/features/execution/RemoteJavaBackend.ts (신규)
import { provaRuntimeConfig } from "@/config/provaRuntime";
import { WorkerDonePayload } from "@/types/prova";

export class RemoteJavaBackend implements ExecutionBackend {
  private abortController: AbortController | null = null;

  constructor(private callbacks: RuntimeCallbacks) {}

  init() {
    // Java 백엔드는 별도 초기화 없음 — 즉시 ready
    this.callbacks.onReady();
  }

  async run(code: string, stdin: string) {
    if (code.trim().length === 0) {
      this.callbacks.onInvalidInput("코드를 입력한 후 디버깅을 시작하세요.");
      return;
    }

    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
      this.callbacks.onTimeout();
    }, provaRuntimeConfig.executionTimeoutMs);

    try {
      const res = await fetch("/api/java/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: this.abortController.signal,
        body: JSON.stringify({
          language: "java",
          code,
          stdin,
          limits: {
            maxTraceSteps: provaRuntimeConfig.maxTraceSteps,
            executionTimeoutMs: provaRuntimeConfig.executionTimeoutMs,
            safeSerializeListLimitRoot: provaRuntimeConfig.safeSerializeListLimitRoot,
            safeSerializeListLimitNested: provaRuntimeConfig.safeSerializeListLimitNested,
          },
        }),
      });

      if (!res.ok) throw new Error(`Java service error: ${res.status}`);

      const payload: WorkerDonePayload = await res.json();
      clearTimeout(timeoutId);
      this.callbacks.onDone(payload);
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name !== "AbortError") {
        this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
  }
}
```

### 4.2 Next.js API 프록시 — `app/api/java/execute/route.ts` (신규)

클라이언트가 Java 실행 서비스 URL·토큰을 직접 알지 못하도록 서버 측에서 프록시합니다.

```typescript
// app/api/java/execute/route.ts (신규)
import { NextRequest, NextResponse } from "next/server";

const JAVA_SERVICE_URL = process.env.JAVA_EXECUTION_SERVICE_URL!;
const JAVA_SERVICE_TOKEN = process.env.JAVA_EXECUTION_SERVICE_TOKEN;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 입력 크기 제한
  const code = String(body?.code ?? "");
  if (code.length > 50_000) {
    return NextResponse.json({ message: "code too large" }, { status: 413 });
  }

  const upstream = await fetch(`${JAVA_SERVICE_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(JAVA_SERVICE_TOKEN ? { Authorization: `Bearer ${JAVA_SERVICE_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
```

### 4.3 Java 실행 서비스 (별도 프로세스)

Next.js 앱과 분리된 서버입니다. 언어는 Java 또는 Kotlin으로 구현합니다.

#### 응답 스키마 (Worker와 동일)

```json
{
  "rawTrace": [
    {
      "step": 0,
      "line": 3,
      "vars": { "n": 5, "arr": [1, 2, 3, 4, 5] },
      "scope": { "func": "main", "depth": 0 },
      "parent_frames": [],
      "stdout": [],
      "runtimeError": null
    }
  ],
  "branchLines": { "loop": [4, 7], "branch": [9] },
  "varTypes": { "n": "int", "arr": "list" }
}
```

#### 트레이서 구조 (바이트코드 계측 방식 — 권장)

```java
// JavaTracer.java (실행 서비스 내부)
import org.objectweb.asm.*;

/**
 * ASM을 이용해 컴파일된 .class 파일에 __snap() 호출을 삽입합니다.
 * 각 라인 이벤트(LINENUMBER opcode)마다 현재 로컬 변수 스냅샷을 캡처합니다.
 */
public class JavaTracer extends ClassVisitor {
  private final List<TraceStep> steps = new ArrayList<>();

  @Override
  public MethodVisitor visitMethod(int access, String name, String desc, ...) {
    return new MethodVisitor(ASM9, super.visitMethod(...)) {
      @Override
      public void visitLineNumber(int line, Label start) {
        // 각 라인 앞에 스냅샷 수집 코드 삽입
        mv.visitMethodInsn(INVOKESTATIC, "Tracer", "__snap",
            "(ILjava/lang/Object;)V", false);
        super.visitLineNumber(line, start);
      }
    };
  }
}
```

#### 변수 직렬화 예시

```java
// VarSerializer.java (실행 서비스 내부)
public class VarSerializer {

  /** Java 런타임 값을 RawTraceStep.vars 형태로 직렬화 */
  public static Object serialize(Object value, int depth, SerializeLimits limits) {
    if (value == null) return null;
    if (value instanceof Integer || value instanceof Long
        || value instanceof Double || value instanceof Boolean) {
      return value; // 기본형 — 그대로
    }
    if (value instanceof String) {
      return value;
    }
    if (value instanceof int[] arr) {
      // int[] → JSON 배열 (list)
      return Arrays.stream(arr).boxed().limit(limits.rootLimit).toList();
    }
    if (value instanceof List<?> list) {
      if (depth >= limits.maxDepth) return "<...>";
      return list.stream()
          .limit(limits.rootLimit)
          .map(e -> serialize(e, depth + 1, limits))
          .toList();
    }
    if (value instanceof Map<?, ?> map) {
      if (depth >= limits.maxDepth) return "<...>";
      var result = new LinkedHashMap<String, Object>();
      map.entrySet().stream().limit(limits.rootLimit).forEach(e ->
          result.put(String.valueOf(e.getKey()), serialize(e.getValue(), depth + 1, limits)));
      return result;
    }
    // 임의 객체: 공개 필드만 직렬화
    return serializeFields(value, depth, limits);
  }

  /**
   * varTypes 추론: Java 런타임 타입 → Prova 타입 문자열
   * int, long, double → "int" / "float"
   * String → "str"
   * int[], List<*> → "list"
   * int[][] → "list2d"
   * Map<*,*> → "dict"
   * Queue, Deque → "queue"
   * Stack, ArrayDeque(stack용) → "stack"
   */
  public static String inferVarType(Object value) {
    if (value instanceof Integer || value instanceof Long) return "int";
    if (value instanceof Double || value instanceof Float) return "float";
    if (value instanceof Boolean) return "bool";
    if (value instanceof String) return "str";
    if (value instanceof int[][] || value instanceof long[][]) return "list2d";
    if (value instanceof int[] || value instanceof long[]
        || value instanceof List) return "list";
    if (value instanceof Map) return "dict";
    if (value instanceof Queue) return "queue";
    return "object";
  }
}
```

---

## 5. 타입 추가 (`src/types/prova.ts`)

```typescript
// src/types/prova.ts 에 추가

/** 현재: "loading" | "ready" | "running" | "reinitializing" | "error"
 *  PyodideStatus를 언어 중립 이름으로 alias (하위 호환 유지) */
export type ExecutionStatus = PyodideStatus;

/** 지원 언어 */
export type SupportedLanguage = "python" | "javascript" | "java";
```

---

## 6. 변경 범위 한눈에 보기

| 파일 | 변경 유형 | 주요 내용 |
|---|---|---|
| `src/types/prova.ts` | **추가** | `SupportedLanguage`, `ExecutionStatus` 타입 |
| `src/features/execution/runtime.ts` | **수정** | backend 선택 분기 추가, 기존 Worker 로직 분리 |
| `src/features/execution/LocalWorkerBackend.ts` | **신규** | 기존 Worker 로직 이관 |
| `src/features/execution/backend.ts` | **신규** | `ExecutionBackend` 인터페이스 |
| `src/features/execution/RemoteJavaBackend.ts` | **신규** | HTTP fetch → Java 서비스 호출 |
| `app/api/java/execute/route.ts` | **신규** | Java 서비스 프록시 |
| `app/page.tsx` | **수정** | Java 옵션 활성화, 파일명 레이블, 노이즈 필터 |
| `app/api/analyze/route.ts` | **수정** | Java 언어 힌트·fallback 패턴 추가 |
| Java 실행 서비스 | **신규** | 별도 프로세스 — javac + ASM 트레이서 + 직렬화 |
| 시각화 컴포넌트 전체 | **변경 없음** | `RawTraceStep` 스키마만 맞으면 동작 |
| `useProvaStore` | **변경 없음** | |
| `trace/merge.ts` | **변경 없음** | |

---

## 7. 개정 이력

| 날짜 | 내용 |
|---|---|
| 2026-04-11 | 초안 작성 |
