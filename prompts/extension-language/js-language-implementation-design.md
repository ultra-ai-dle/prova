# JavaScript 언어 추가 구현 설계

> Prova에 JavaScript(ES2022, 동기 코드 한정) 지원을 추가하기 위한 실행 가능한 구현 설계입니다.
> 기존 Python 파이프라인과 완전히 병렬로 동작하며, 시각화·AI 분류 레이어는 건드리지 않습니다.

---

## 0. 핵심 접근 방식 결정

### Python vs JS 트레이싱 차이

|           | Python                               | JavaScript                                 |
| --------- | ------------------------------------ | ------------------------------------------ |
| 실행 엔진 | Pyodide (WASM)                       | 브라우저 내 JS 엔진 (네이티브)             |
| 트레이서  | `sys.settrace()` — 런타임 훅         | **없음** — AST 계측(instrumentation) 필요  |
| 심볼 추출 | `ast.parse()` (Python AST)           | Acorn (JS AST 파서, ~100KB)                |
| 변수 접근 | `frame.f_locals` / `frame.f_globals` | **없음** — `{var1, var2}` 형태로 직접 주입 |
| 실행 제한 | Pyodide timeout                      | `Worker.terminate()` (기존과 동일)         |

### 선택: AST 계측(Instrumentation) 방식

사용자 코드를 실행 전 변환합니다.

```js
// [입력] 사용자가 작성한 JS
let arr = [3, 1, 2];
arr.sort((a, b) => a - b);
console.log(arr[0]);

// [변환 후] Worker 내부에서 실행되는 코드
let arr = [3, 1, 2];
__snap(1, () => ({ arr }));
arr.sort((a, b) => a - b);
__snap(2, () => ({ arr }));
console.log(arr[0]);
__snap(3, () => ({ arr }));
```

`__snap(line, () => capture)` — 람다를 사용해 직렬화 시점을 지연시켜
`arr.sort()` 완료 후 새 값을 캡처합니다.

---

## 1. 새로 만들 파일

### `public/worker/js.worker.js` (신규, ~350줄 예상)

Worker 전체 구조는 `pyodide.worker.js`와 **동일한 메시지 프로토콜**을 따릅니다.

```
self.onmessage({ code, stdin, limits })
  → instrumentAndRun(code, stdin, limits)
    → parseUserSymbols(code)          // Acorn AST로 유저 정의 변수 추출
    → instrumentCode(code, symbols)   // 계측 코드 삽입
    → executeInSandbox(instrumented)  // new Function()으로 실행
  → postMessage({ type: "done", rawTrace, branchLines, varTypes })
```

#### 1-1. Acorn 로드 (CDN)

```js
// Worker 상단에서 CDN으로 Acorn 로드 (약 100KB, 초기 1회만)
importScripts("https://cdn.jsdelivr.net/npm/acorn@8.14.1/dist/acorn.min.js");
```

#### 1-2. 심볼 추출 (`parseUserSymbols`)

Acorn AST를 걷(walk)어서 유저가 선언한 모든 식별자를 추출합니다.

```js
function parseUserSymbols(code) {
  const symbols = new Set();
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: "script" });
  } catch {
    // 파싱 실패 시 빈 세트 반환 (실행 시 SyntaxError로 처리됨)
    return symbols;
  }

  function walk(node) {
    if (!node || typeof node !== "object") return;

    // 변수 선언: let x = ..., const y = ..., var z = ...
    if (node.type === "VariableDeclaration") {
      for (const decl of node.declarations) {
        collectPattern(decl.id, symbols);
      }
    }
    // 함수 선언: function foo(a, b) {}
    if (node.type === "FunctionDeclaration" && node.id) {
      symbols.add(node.id.name);
    }
    // 클래스 선언
    if (node.type === "ClassDeclaration" && node.id) {
      symbols.add(node.id.name);
    }
    // for...of / for...in 루프 변수
    if (
      (node.type === "ForOfStatement" || node.type === "ForInStatement") &&
      node.left
    ) {
      if (node.left.type === "VariableDeclaration") {
        for (const d of node.left.declarations) collectPattern(d.id, symbols);
      }
    }
    // 재귀적 walk
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === "object" && child.type) walk(child);
    }
  }

  function collectPattern(node, set) {
    if (!node) return;
    if (node.type === "Identifier") {
      set.add(node.name);
      return;
    }
    if (node.type === "ArrayPattern") {
      node.elements.forEach((e) => collectPattern(e, set));
      return;
    }
    if (node.type === "ObjectPattern") {
      node.properties.forEach((p) => collectPattern(p.value, set));
      return;
    }
  }

  walk(ast);
  return symbols;
}
```

#### 1-3. 코드 계측 (`instrumentCode`)

Acorn의 `loc` 정보를 활용해 각 statement 뒤에 `__snap()` 호출을 삽입합니다.

> **현재 설계 (오프셋 기반 문자열 삽입)**: 전체 AST를 재생성하는 대신,
> 소스 문자열에 `stmt.end` 오프셋을 기준으로 삽입 문자열을 추가합니다.
> Acorn만으로 구현 가능하고 Babel/recast 같은 코드 생성기가 불필요하지만,
> **아래 "계측 방식의 알려진 문제"에 정리된 edge case들이 존재합니다.**
> 근본적인 해결 방법은 섹션 7을 참고하세요.

```js
function instrumentCode(code, symbols) {
  const ast = acorn.parse(code, {
    ecmaVersion: 2022,
    sourceType: "script",
    locations: true, // ← line/column 정보 포함 (필수)
  });

  // 삽입 포인트 수집: { offset, text }[]
  // (역순으로 삽입해야 오프셋이 틀어지지 않음)
  const insertions = [];

  // 각 최상위 statement와 블록 내 statement를 순회
  function visitStatements(body) {
    for (const stmt of body) {
      if (!stmt || !stmt.loc) continue;

      const line = stmt.loc.start.line;
      const endOffset = stmt.end;

      // 해당 시점에 스코프에 있는 심볼들만 캡처
      // 단순화: 전역 유저 심볼 전체를 전달 (런타임에 undefined인 것은 직렬화에서 제외)
      const capture = buildCapture(symbols);
      insertions.push({
        offset: endOffset,
        text: `; __snap(${line}, () => (${capture}))`,
      });

      // 블록을 가진 statement 내부도 재귀 방문
      visitNode(stmt);
    }
  }

  function visitNode(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "BlockStatement") visitStatements(node.body);
    if (node.type === "IfStatement") {
      visitNode(node.consequent);
      if (node.alternate) visitNode(node.alternate);
    }
    if (
      [
        "ForStatement",
        "ForOfStatement",
        "ForInStatement",
        "WhileStatement",
        "DoWhileStatement",
      ].includes(node.type)
    ) {
      visitNode(node.body);
    }
    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      visitNode(node.body);
    }
    if (node.type === "TryStatement") {
      visitNode(node.block);
      if (node.handler) visitNode(node.handler.body);
      if (node.finalizer) visitNode(node.finalizer);
    }
  }

  visitStatements(ast.body);

  // 역순 삽입 (오프셋 보존)
  insertions.sort((a, b) => b.offset - a.offset);
  let result = code;
  for (const ins of insertions) {
    result = result.slice(0, ins.offset) + ins.text + result.slice(ins.offset);
  }
  return result;
}

function buildCapture(symbols) {
  // { arr, n, i, j, ... } — undefined 변수는 직렬화 시 제외
  const keys = [...symbols].filter((s) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s));
  return `{ ${keys.join(", ")} }`;
}
```

#### 1-4. 변수 직렬화 (`_safeJs`)

Python의 `_safe()` 함수와 동일한 역할. JS 타입에 맞게 구현합니다.

```js
function _safeJs(value, depth = 0, safeL0 = 30, safeLN = 12) {
  if (depth > 2) return String(value);
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";
    return value;
  }
  const limit = depth === 0 ? safeL0 : safeLN;
  if (Array.isArray(value)) {
    const sliced = value
      .slice(0, limit)
      .map((v) => _safeJs(v, depth + 1, safeL0, safeLN));
    if (value.length > limit) sliced.push(`...(+${value.length - limit})`);
    return sliced;
  }
  if (value instanceof Map) {
    const out = {};
    let count = 0;
    for (const [k, v] of value) {
      if (count++ >= limit) {
        out["..."] = `+${value.size - limit} items`;
        break;
      }
      out[String(_safeJs(k, depth + 1, safeL0, safeLN))] = _safeJs(
        v,
        depth + 1,
        safeL0,
        safeLN,
      );
    }
    return out;
  }
  if (value instanceof Set) {
    return [...value]
      .slice(0, limit)
      .map((v) => _safeJs(v, depth + 1, safeL0, safeLN));
  }
  if (typeof value === "object" && value !== null) {
    const out = {};
    let count = 0;
    for (const [k, v] of Object.entries(value)) {
      if (count++ >= limit) {
        out["..."] = `+${Object.keys(value).length - limit} items`;
        break;
      }
      out[k] = _safeJs(v, depth + 1, safeL0, safeLN);
    }
    return out;
  }
  return String(value);
}
```

#### 1-5. 샌드박스 실행 (`executeInSandbox`)

`__snap` 훅을 주입하고 `new Function()`으로 실행합니다.

```js
function executeInSandbox(instrumentedCode, stdin, limits) {
  const maxSteps = limits.maxTraceSteps ?? 10000;
  const safeL0 = limits.safeSerializeListLimitRoot ?? 30;
  const safeLN = limits.safeSerializeListLimitNested ?? 12;

  const trace = [];
  let step = 0;
  let truncated = false;
  const stdoutLines = [];

  // step 0: 초기 상태
  trace.push({
    step: 0,
    line: 0,
    vars: {},
    scope: { func: "<global>", depth: 1 },
    parent_frames: [],
    stdout: [],
    runtimeError: null,
  });
  step = 1;

  function __snap(line, captureThunk) {
    if (truncated) return;
    if (step >= maxSteps) {
      truncated = true;
      return;
    }
    let rawVars = {};
    try {
      rawVars = captureThunk();
    } catch {}
    const vars = {};
    for (const [k, v] of Object.entries(rawVars)) {
      if (v === undefined) continue; // 아직 선언 전인 변수 제외
      if (typeof v === "function") continue; // 함수 제외
      vars[k] = _safeJs(v, 0, safeL0, safeLN);
    }
    trace.push({
      step,
      line,
      vars,
      scope: { func: "<global>", depth: 1 },
      parent_frames: [],
      stdout: [...stdoutLines],
      runtimeError: null,
    });
    step++;
  }

  // console.log 리다이렉트
  const fakeConsole = {
    log: (...args) => stdoutLines.push(args.map(String).join(" ")),
    warn: (...args) => stdoutLines.push("[warn] " + args.map(String).join(" ")),
    error: (...args) =>
      stdoutLines.push("[error] " + args.map(String).join(" ")),
  };

  // stdin 처리 (readline 스타일)
  const stdinLines = String(stdin ?? "").split("\n");
  let stdinIdx = 0;
  const fakeReadline = () => stdinLines[stdinIdx++] ?? "";

  try {
    // new Function으로 격리된 컨텍스트에서 실행
    // eslint-disable-next-line no-new-func
    const fn = new Function("__snap", "console", "readline", instrumentedCode);
    fn(__snap, fakeConsole, fakeReadline);
    // 최종 상태 추가
    const lastVars =
      trace.length > 0 ? { ...trace[trace.length - 1].vars } : {};
    trace.push({
      step,
      line: trace[trace.length - 1]?.line ?? 0,
      vars: lastVars,
      scope: { func: "<global>", depth: 1 },
      parent_frames: [],
      stdout: [...stdoutLines],
      runtimeError: null,
    });
    if (truncated) {
      const last = trace[trace.length - 1];
      last.stdout = [
        ...stdoutLines,
        "[warn] 추적 단계 한도를 초과해 일부 단계가 생략되었습니다.",
      ];
    }
  } catch (err) {
    // SyntaxError: Acorn이 잡지 못한 케이스 또는 런타임 에러
    const lineNo = extractErrorLine(err, instrumentedCode) ?? 0;
    trace.push({
      step,
      line: lineNo,
      vars: {},
      scope: { func: "<global>", depth: 1 },
      parent_frames: [],
      stdout: [...stdoutLines],
      runtimeError: {
        type: err.constructor.name,
        message: err.message,
        line: lineNo,
      },
    });
  }
  return trace;
}

function extractErrorLine(err, code) {
  // V8 stack trace에서 줄 번호 추출 시도
  // "<anonymous>:N:M" 패턴 탐색
  const m = (err.stack ?? "").match(/<anonymous>:(\d+):/);
  return m ? parseInt(m[1], 10) : null;
}
```

#### 1-6. 메시지 핸들러

`pyodide.worker.js`와 동일한 프로토콜. `ready` 이벤트는 Acorn 로드 완료 시점에 발송합니다.

```js
let acornReady = false;
function ensureAcorn() {
  if (acornReady) return;
  importScripts("https://cdn.jsdelivr.net/npm/acorn@8.14.1/dist/acorn.min.js");
  acornReady = true;
  self.postMessage({ type: "ready" });
}

self.onmessage = (event) => {
  const { code = "", stdin = "", limits = {} } = event.data || {};
  ensureAcorn();

  if (!code.trim()) {
    self.postMessage({
      type: "invalid_input",
      message: "코드를 입력한 후 디버깅을 시작하세요.",
    });
    return;
  }
  // JS는 stdin이 없어도 실행 가능 → stdin 빈 값 허용

  let rawTrace;
  try {
    const symbols = parseUserSymbols(code);
    const instrumented = instrumentCode(code, symbols);
    rawTrace = executeInSandbox(instrumented, stdin, limits);
  } catch (err) {
    rawTrace = [
      {
        step: 0,
        line: 0,
        vars: {},
        scope: { func: "<global>", depth: 1 },
        parent_frames: [],
        stdout: [],
        runtimeError: { type: "WorkerError", message: String(err), line: 0 },
      },
    ];
  }

  const varTypes = extractVarTypesUnion(rawTrace); // pyodide.worker.js와 동일 함수
  self.postMessage({
    type: "done",
    rawTrace,
    branchLines: { loop: [], branch: [] },
    varTypes,
  });
};

// 즉시 Acorn 로드 시작
ensureAcorn();
```

---

## 2. 수정할 파일 목록

### 2-1. `src/features/execution/runtime.ts`

`ProvaRuntime`이 언어를 받아 올바른 Worker 파일을 선택하도록 변경합니다.

**변경 전 (`createWorker` 메서드):**

```ts
private createWorker() {
  this.worker?.terminate();
  this.worker = new Worker("/worker/pyodide.worker.js");
  ...
}
```

**변경 후:**

```ts
// 생성자에 language 추가
constructor(private callbacks: RuntimeCallbacks, private language: string = "python") {}

private workerUrl(): string {
  if (this.language === "javascript") return "/worker/js.worker.js";
  return "/worker/pyodide.worker.js";   // 기본값: python
}

private createWorker() {
  this.worker?.terminate();
  this.worker = new Worker(this.workerUrl());
  ...
}
```

`runtime.ts`에서 `language`를 외부에서 주입받으므로
Worker 재생성 시 언어가 바뀌어도 올바른 파일을 씁니다.

### 2-2. `app/page.tsx`

4곳을 수정합니다.

#### (a) ProvaRuntime 생성 시 language 전달

```ts
// 현재 (~line 280)
const [language, setLanguage] = useState("python");

// ProvaRuntime 생성 부분에 language 전달
// (ProvaRuntime init/재생성 로직에서)
runtimeRef.current = new ProvaRuntime(callbacks, language);
```

언어가 바뀔 때 기존 Worker를 종료하고 새 Worker를 생성해야 합니다.

```ts
// language 변경 effect
useEffect(() => {
  if (runtimeRef.current) {
    runtimeRef.current.destroy();
    runtimeRef.current = null;
  }
  // 새 언어로 초기화
  const rt = new ProvaRuntime(runtimeCallbacks, language);
  rt.init();
  runtimeRef.current = rt;
  // 기존 트레이스 초기화
  resetTrace();
}, [language]);
```

#### (b) JS 언어 선택지 활성화

```tsx
// 현재 (~line 809)
<option value="javascript" disabled>JavaScript (준비중)</option>

// 변경 후
<option value="javascript">JavaScript</option>
```

#### (c) JS 하이라이터 추가

```ts
const JS_KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "true",
  "false",
  "null",
  "undefined",
  "async",
  "await",
]);

function highlightJsLine(
  line: string,
): Array<{ text: string; className: string }> {
  const tokens: Array<{ text: string; className: string }> = [];
  // JS: //로 시작하는 주석, 백틱/쌍따옴표/따옴표 문자열
  const pattern =
    /(\/\/.*$|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_$][A-Za-z0-9_$]*\b|\b\d+(?:\.\d+)?\b)/g;
  // ... (highlightPythonLine과 동일한 구조, JS_KEYWORDS 사용)
}
```

#### (d) 언어에 따라 하이라이터 선택

```tsx
// 현재 (line ~882, ~961)
{highlightPythonLine(line).map(...)}

// 변경 후
{(language === "javascript" ? highlightJsLine : highlightPythonLine)(line).map(...)}
```

#### (e) stdin 필수 검증 완화 (JS는 stdin 없어도 실행 가능)

JS Worker는 stdin이 빈 문자열이어도 실행되도록 이미 설계했으나,
`runtime.ts`의 클라이언트 측 검증도 언어에 따라 분기해야 합니다.

```ts
// runtime.ts run() 메서드
run(code: string, stdin: string) {
  if (code.trim().length === 0) {
    this.callbacks.onInvalidInput("코드를 입력한 후 디버깅을 시작하세요.");
    return;
  }
  // Python만 stdin 필수
  if (this.language === "python" && stdin.trim().length === 0) {
    this.callbacks.onInvalidInput("예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.");
    return;
  }
  ...
}
```

#### (f) 런타임 노이즈 필터 분기

```ts
// 현재 isRuntimeNoiseVar에 Python 특화 패턴이 있음 (~line 149)
if (/(^_|import|frozen|zipimport|built-?in|site-packages|python3)/i.test(key))
  return true;

// JS Worker가 출력하는 내부 변수(__snap, __prova* 등)를 필터
function isJsRuntimeNoiseVar(name: string) {
  if (name.startsWith("__")) return true;
  if (["console", "readline", "arguments"].includes(name)) return true;
  return false;
}
```

#### (g) Python 뱃지 문구 조건부 표시

```tsx
// 현재 (~line 974-977)
{/* Python badge */}
Python 3.11 · Standard Library · No external packages

// 변경 후
{language === "python"
  ? "Python 3.11 · Standard Library · No external packages"
  : "JavaScript ES2022 · 동기 코드만 지원 · async/await 미지원"}
```

### 2-3. `app/api/analyze/route.ts`

#### (a) 요청 본문에 `language` 필드 추가

```ts
// POST 핸들러 파싱 부분
const { code, varTypes, language = "python" } = await req.json();
```

#### (b) AI 프롬프트 언어별 분기

```ts
// 현재 프롬프트 첫 줄
"Python 코드의 자료구조/알고리즘 분류기다.",

// 변경 후
const langLabel = language === "javascript" ? "JavaScript" : "Python";
const langHints = language === "javascript" ? [
  "JS 특화: Array.push/pop은 스택, shift/unshift는 큐, Map은 dict, Set은 set.",
  "JS 특화: for...of 루프, forEach, reduce 등 고차 함수 패턴도 인식.",
  "JS 특화: deque 대신 배열+shift/unshift 조합으로 BFS 큐를 구현함.",
  "JS 특화: 재귀 함수 인식 시 스택 프레임이 없을 수 있음 — 반복 구현과 동일하게 분류.",
] : [
  "deque()는 반드시 자료구조로 감지하고 append+popleft면 queue/BFS 반영.",
  // ... 기존 Python 힌트들
];

const prompt = [
  `${langLabel} 코드의 자료구조/알고리즘 분류기다.`,
  "설명 없이 JSON 객체 하나만 출력.",
  ...langHints,
  // ... 나머지 공통 프롬프트
].join("\n");
```

#### (c) JS용 후처리 함수 추가

Python의 `applyDequeHints`에 대응하는 JS 버전:

```ts
function applyJsQueueHints(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  // arr.shift() + arr.push() → BFS queue 패턴
  const hasShift = /\.shift\s*\(/.test(code);
  const hasPush = /\.push\s*\(/.test(code);
  if (!hasShift || !hasPush) return meta;

  // queue로 쓰이는 배열 변수 탐지: let queue = []; / const q = [];
  const queueVarMatch = code.match(
    /\b(let|const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\[/g,
  );
  // ... 간단한 이름 기반 감지
  return {
    ...meta,
    tags: normalizeAndDedupeTags([...(meta.tags ?? []), "queue", "bfs"], 10),
  };
}
```

#### (d) `/api/analyze` 호출 시 language 포함 (page.tsx)

```ts
// page.tsx에서 /api/analyze 호출 시
const res = await fetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code, varTypes, language }), // language 추가
});
```

### 2-4. `src/types/prova.ts`

`PyodideStatus` 타입명이 언어 중립적이지 않아 이름 변경을 고려할 수 있으나,
MVP에서는 기존 타입명 유지 (사용처가 많아 리팩토링 비용 큼).

언어 타입 추가만:

```ts
// 기존 유지, 한 줄만 추가
export type SupportedLanguage = "python" | "javascript";
```

---

## 3. 구현 순서 (단계별)

### Phase 1 — Worker 단독 완성 (핵심, 독립적으로 테스트 가능)

1. `public/worker/js.worker.js` 작성
2. 브라우저 콘솔에서 직접 Worker 테스트:
   ```js
   const w = new Worker("/worker/js.worker.js");
   w.onmessage = (e) => console.log(e.data);
   w.postMessage({
     code: "let arr = [3,1,2]; arr.sort((a,b)=>a-b);",
     stdin: "",
   });
   // 기대값: { type: "done", rawTrace: [...], varTypes: { arr: "list" } }
   ```
3. 다양한 알고리즘 코드로 rawTrace 출력 검증

### Phase 2 — Runtime 연결

4. `runtime.ts` 수정 (language 주입, workerUrl 분기)
5. `page.tsx` 수정: language state → ProvaRuntime 재생성 effect
6. `page.tsx` 수정: JS 언어 선택지 활성화
7. `page.tsx` 수정: stdin 검증 완화 (JS는 선택)

### Phase 3 — UI 마무리

8. `page.tsx` 수정: JS 하이라이터 (`highlightJsLine`) 추가
9. `page.tsx` 수정: 하이라이터 분기 적용
10. `page.tsx` 수정: 뱃지 문구 분기
11. `page.tsx` 수정: 노이즈 필터 분기

### Phase 4 — AI 분류 개선

12. `app/api/analyze/route.ts` 수정: language 파라미터 수신
13. AI 프롬프트 언어별 분기
14. JS 후처리 함수 추가

---

## 4. 알려진 한계 (MVP 범위 외)

### 계측 방식의 알려진 문제 (오프셋 기반 삽입)

오프셋 기반 문자열 삽입 방식은 구현이 단순하지만 다음 패턴에서 스냅샷이 누락되거나 unreachable 코드가 생성됩니다.

| 문제                                            | 예시                                      | 증상                                                                |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| **중괄호 없는 단문 블록**                       | `if (x > 0) x--;`                         | `x--` 줄에 `__snap` 미삽입 → 해당 스텝 누락                         |
|                                                 | `for (let i = 0; i < n; i++) arr[i]++;`   | 루프 바디 스텝 누락                                                 |
|                                                 | `while (cond) doSomething();`             | 동일                                                                |
| **`return`/`break`/`continue`/`throw` 뒤 삽입** | `return arr[0];`                          | 삽입된 `__snap`이 unreachable → 함수 종료 시점 상태 캡처 누락       |
| **`switch` 문 미처리**                          | `switch(op) { case "push": ...; break; }` | case 내부 전체 스텝 누락                                            |
| **`for` 루프 update 표현식**                    | `for (let i = 0; i < n; i++)`             | `i++` 시점 스냅샷 없음 → 루프 카운터 증가가 다음 바디 스텝에야 보임 |
| **화살표 함수 단문 body**                       | `arr.map(x => x + 1)`                     | expression body 내부 캡처 불가                                      |

이 문제들의 근본 원인과 해결 방향은 **섹션 7**에 정리되어 있습니다.

### 기타 한계

| 항목                    | 설명                                                      | 향후 해결 방법                           |
| ----------------------- | --------------------------------------------------------- | ---------------------------------------- |
| `async/await` 미지원    | 비동기 코드는 트레이스 불가                               | 별도 async instrumentation 레이어        |
| 클로저 변수 캡처 부정확 | 함수 내부 변수가 상위 스코프에서 undefined로 보일 수 있음 | 스코프별 심볼 테이블 구성 (복잡도 높음)  |
| `class` 인스턴스 직렬화 | 클래스 인스턴스는 `{...obj}` 형태로 단순 직렬화           | `__snap` 에서 prototype 체인 직렬화 추가 |
| `import/require` 미지원 | `new Function()`은 모듈 시스템 없음                       | Rollup/esbuild WASM 번들러 연동          |
| CDN 의존성              | Acorn을 CDN에서 로드 (오프라인 불가)                      | `public/` 에 Acorn 번들 포함             |
| 에러 라인 번호 부정확   | 계측 코드 삽입 후 줄 번호가 밀릴 수 있음                  | Source map 생성 후 역매핑                |

---

## 5. 파일 변경 요약

| 파일                                | 작업                                             | 난이도 |
| ----------------------------------- | ------------------------------------------------ | ------ |
| `public/worker/js.worker.js`        | **신규 생성** (~350줄)                           | 높음   |
| `src/features/execution/runtime.ts` | language 주입, Worker URL 분기 (+15줄)           | 낮음   |
| `app/page.tsx`                      | JS 활성화, 하이라이터, effect, 검증 완화 (+80줄) | 중간   |
| `app/api/analyze/route.ts`          | language 파라미터, 프롬프트 분기 (+60줄)         | 중간   |
| `src/types/prova.ts`                | `SupportedLanguage` 타입 추가 (+2줄)             | 낮음   |

**총 예상 작업량: 약 500줄 (신규 Worker 350줄 + 기존 파일 수정 150줄)**

시각화, 상태 관리, AI 응답 파싱, 병합 로직은 **전혀 수정하지 않습니다.**

---

## 6. 계측 방식 개선 방향 (오프셋 삽입 → AST 재생성)

### 문제의 근본 원인

Acorn은 **파서(parser)만** 제공하고 코드 생성기(code generator)가 없습니다.
그래서 섹션 1-3의 현재 구현은 파싱된 AST를 수정하는 대신 원본 소스 문자열에 직접 오프셋 기반으로 문자열을 삽입합니다.

이 방식은 AST의 구조적 의미를 무시하기 때문에 다음 패턴에서 깨집니다:

- **중괄호 없는 단문**: `if (x) y++` → AST는 body가 `ExpressionStatement`이지
  `BlockStatement`가 아님 → `visitStatements` 순회 대상에서 제외됨
- **`return`/`break` 뒤 삽입**: 오프셋 기준으로 statement `end` 뒤에 삽입하면
  제어 흐름이 이미 빠져나간 뒤라 unreachable code가 됨
- **`switch`**: `SwitchCase.consequent`는 statement 배열이지만 별도 처리가 없어 누락

### 해결책: Acorn + astring (AST 재생성)

**`astring`** (~15KB) 은 Acorn이 생성한 ESTree 형식의 AST를 다시 JS 코드로 변환하는 경량 코드 생성기입니다.

```
Acorn (파싱)  →  AST 조작 (노드 삽입)  →  astring (AST → 코드 재생성)
```

Acorn + astring 합계 **~115KB** — Babel의 약 1/4 수준.

#### 개선된 접근 방식

문자열에 삽입하는 대신 AST 노드 자체를 조작합니다.

```js
// 기존: 문자열 오프셋 기반 삽입 (깨짐)
result =
  result.slice(0, stmt.end) +
  "; __snap(line, () => ({...}))" +
  result.slice(stmt.end);

// 개선: AST 노드로 __snap 호출을 생성하고 body 배열에 직접 삽입
function makeSnapNode(line, symbols) {
  // AST 노드로 `__snap(line, () => ({ a, b, c }))` 표현
  return {
    type: "ExpressionStatement",
    expression: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "__snap" },
      arguments: [
        { type: "Literal", value: line },
        {
          type: "ArrowFunctionExpression",
          params: [],
          body: {
            type: "ObjectExpression",
            properties: [...symbols].map((name) => ({
              type: "Property",
              shorthand: true,
              key: { type: "Identifier", name },
              value: { type: "Identifier", name },
            })),
          },
        },
      ],
    },
  };
}
```

#### 중괄호 없는 단문 처리

AST 조작 시 단문 body를 `BlockStatement`로 자동 래핑합니다.

```js
function wrapSingleStatement(node) {
  // if (x > 0) x--; → if (x > 0) { x--; __snap(...); }
  if (node && node.type !== "BlockStatement") {
    return { type: "BlockStatement", body: [node] };
  }
  return node;
}

// IfStatement 처리 시
if (node.type === "IfStatement") {
  node.consequent = wrapSingleStatement(node.consequent);
  if (node.alternate) node.alternate = wrapSingleStatement(node.alternate);
}
```

#### `return`/`break`/`throw` 처리

`__snap`을 statement **뒤**가 아니라 **앞**에 삽입합니다.

```js
function visitStatements(body) {
  const newBody = [];
  for (const stmt of body) {
    const isExit = [
      "ReturnStatement",
      "ThrowStatement",
      "BreakStatement",
      "ContinueStatement",
    ].includes(stmt.type);

    if (isExit) {
      // exit 문 앞에 snap 삽입
      newBody.push(makeSnapNode(stmt.loc.start.line, symbols));
      newBody.push(stmt);
    } else {
      newBody.push(stmt);
      // 일반 문 뒤에 snap 삽입
      newBody.push(makeSnapNode(stmt.loc.end.line, symbols));
      visitNode(stmt); // 블록 내부 재귀
    }
  }
  body.length = 0;
  body.push(...newBody);
}
```

#### switch 처리

```js
if (node.type === "SwitchStatement") {
  for (const sc of node.cases) {
    visitStatements(sc.consequent);
  }
}
```

### 라이브러리 비교

|                  | Acorn 단독 (현재)  | Acorn + astring (개선) | Babel           |
| ---------------- | ------------------ | ---------------------- | --------------- |
| 번들 크기        | ~100KB             | ~115KB                 | ~500KB+         |
| 코드 생성        | 없음 (오프셋 삽입) | ESTree → JS 재생성     | 완전한 AST 변환 |
| 단문 블록 처리   | 누락               | 자동 래핑              | 자동 래핑       |
| `return` 앞 삽입 | 불가 (뒤에 삽입)   | 가능                   | 가능            |
| `switch` 처리    | 누락               | 가능                   | 가능            |
| 구현 복잡도      | 낮음               | 중간                   | 높음            |

### 결론

MVP에서는 오프셋 방식으로 먼저 동작을 검증하고,
알고리즘 시각화에서 주로 쓰이는 패턴(중괄호 있는 `for`/`while`, 전역 스코프 코드)이
대부분 정상 동작하는 것을 확인한 뒤 astring 기반으로 교체하는 것이 합리적입니다.

교체 시 `instrumentCode` 함수만 수정하면 되며, Worker의 나머지 코드(직렬화, 실행, 메시지 프로토콜)는 그대로 유지됩니다.

---

## 7. 구현 체크리스트 (바로 뛰어들기)

> 이 섹션만 보고 순서대로 따라가면 JS 지원이 완성됩니다.
> 각 스텝은 독립적으로 브라우저에서 검증 가능하도록 설계되어 있습니다.

---

### STEP 1 — `public/worker/js.worker.js` 신규 생성

**무엇을**: JS 실행 + 트레이싱 Worker  
**참고**: 섹션 1 전체 (1-1 ~ 1-6)  
**완료 조건**: 아래 테스트가 콘솔에서 통과

```js
// 브라우저 콘솔에서 직접 테스트
const w = new Worker("/worker/js.worker.js");
w.onmessage = (e) => console.log(JSON.stringify(e.data, null, 2));
w.postMessage({
  code: `let arr = [3, 1, 2];
for (let i = 0; i < arr.length - 1; i++) {
  for (let j = 0; j < arr.length - 1 - i; j++) {
    if (arr[j] > arr[j+1]) {
      let tmp = arr[j]; arr[j] = arr[j+1]; arr[j+1] = tmp;
    }
  }
}`,
  stdin: "",
  limits: {},
});
// 기대값:
// { type: "done", rawTrace: [ { step: 0, line: 0, vars: {} }, ...], varTypes: { arr: "list", i: "int", j: "int", tmp: "int" } }
```

함수 구현 순서:

1. `inferType` + `extractVarTypesUnion` — pyodide.worker.js와 동일, 복붙 가능
2. `parseUserSymbols(code)` — Acorn AST walk로 유저 정의 식별자 수집 (섹션 1-2)
3. `_safeJs(value, depth)` — JS 타입용 직렬화 (섹션 1-4)
4. `instrumentCode(code, symbols)` — 오프셋 기반 `__snap` 삽입 (섹션 1-3)
5. `executeInSandbox(instrumented, stdin, limits)` — `new Function()` 실행 (섹션 1-5)
6. `self.onmessage` 핸들러 + `ensureAcorn()` (섹션 1-6)

> **주의**: `stdin`이 빈 문자열이어도 실행 가능하게 구현 (Python과 다름)

---

### STEP 2 — `src/features/execution/runtime.ts` 수정

**무엇을**: Worker URL을 language에 따라 분기  
**참고**: 섹션 2-1  
**변경량**: +15줄

```ts
// 1. 생성자에 language 파라미터 추가
constructor(private callbacks: RuntimeCallbacks, private language: string = "python") {}

// 2. workerUrl() 메서드 추가
private workerUrl(): string {
  if (this.language === "javascript") return "/worker/js.worker.js";
  return "/worker/pyodide.worker.js";
}

// 3. createWorker() 안에서 하드코딩된 경로를 workerUrl()로 교체
this.worker = new Worker(this.workerUrl());

// 4. run() 메서드: stdin 검증을 language 조건부로 변경
if (this.language === "python" && stdin.trim().length === 0) {
  this.callbacks.onInvalidInput("예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.");
  return;
}
```

---

### STEP 3 — `app/page.tsx` 수정 (5군데)

**참고**: 섹션 2-2  
**변경량**: +80줄

#### 3-a. JS 언어 선택지 활성화 (line ~809)

```tsx
// before
<option value="javascript" disabled>JavaScript (준비중)</option>
// after
<option value="javascript">JavaScript</option>
```

#### 3-b. language 변경 시 Worker 재생성 effect 추가

`useState("python")`이 있는 곳 근처에 추가:

```ts
useEffect(() => {
  runtimeRef.current?.destroy();
  runtimeRef.current = null;
  const rt = new ProvaRuntime(runtimeCallbacks, language);
  rt.init();
  runtimeRef.current = rt;
  resetTrace(); // 기존 트레이스 초기화 (store action)
}, [language]);
```

> `ProvaRuntime` 생성자 시그니처 변경(STEP 2)이 먼저 완료되어야 함

#### 3-c. JS 키워드 하이라이터 추가

`PY_KEYWORDS` / `highlightPythonLine` 정의 바로 아래에 추가:

```ts
const JS_KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "true",
  "false",
  "null",
  "undefined",
  "async",
  "await",
]);

function highlightJsLine(
  line: string,
): Array<{ text: string; className: string }> {
  const tokens: Array<{ text: string; className: string }> = [];
  // JS는 //로 시작하는 라인 주석, 백틱 템플릿 리터럴 추가
  const pattern =
    /(\/\/.*$|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_$][A-Za-z0-9_$]*\b|\b\d+(?:\.\d+)?\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(line);
  while (match) {
    if (match.index > lastIndex)
      tokens.push({
        text: line.slice(lastIndex, match.index),
        className: "text-[#c9d1d9]",
      });
    const token = match[0];
    if (token.startsWith("//"))
      tokens.push({ text: token, className: "text-[#8b949e] italic" });
    else if (/^["`']/.test(token))
      tokens.push({ text: token, className: "text-[#a5d6ff]" });
    else if (/^\d/.test(token))
      tokens.push({ text: token, className: "text-[#79c0ff]" });
    else if (JS_KEYWORDS.has(token))
      tokens.push({ text: token, className: "text-[#ff7b72]" });
    else tokens.push({ text: token, className: "text-[#d2a8ff]" });
    lastIndex = match.index + token.length;
    match = pattern.exec(line);
  }
  if (lastIndex < line.length)
    tokens.push({ text: line.slice(lastIndex), className: "text-[#c9d1d9]" });
  if (tokens.length === 0)
    tokens.push({ text: " ", className: "text-[#c9d1d9]" });
  return tokens;
}
```

#### 3-d. 하이라이터 분기 적용 (line ~882, ~961 두 군데)

```tsx
// before
{highlightPythonLine(line).map(...)}
// after
{(language === "javascript" ? highlightJsLine : highlightPythonLine)(line).map(...)}
```

#### 3-e. 런타임 노이즈 필터 + 뱃지 문구 분기

`isRuntimeNoiseVar` 함수에 JS 내부 변수 필터 추가:

```ts
// 기존 Python 패턴 조건 앞에 추가
if (language === "javascript") {
  if (name.startsWith("__")) return true;
  if (["console", "readline", "arguments"].includes(name)) return true;
  return false;
}
```

뱃지 문구 (line ~977):

```tsx
// before
Python 3.11 · Standard Library · No external packages
// after
{language === "javascript"
  ? "JavaScript ES2022 · 동기 코드만 지원 · async/await 미지원"
  : "Python 3.11 · Standard Library · No external packages"}
```

**STEP 3 완료 조건**: 언어 선택 드롭다운에서 JavaScript 선택 → 코드 입력 → "디버깅 시작" 클릭 → 시각화 패널에 트레이스 표시

---

### STEP 4 — `app/api/analyze/route.ts` 수정

**무엇을**: AI 프롬프트를 언어별로 분기  
**참고**: 섹션 2-3  
**변경량**: +60줄

#### 4-a. POST 핸들러에서 language 파싱 (line ~597)

```ts
const { code, varTypes, language = "python" } = await req.json();
```

#### 4-b. `analyzeWithAi` 함수 시그니처에 language 추가

```ts
async function analyzeWithAi(
  code: string,
  varTypes: Record<string, string>,
  language: string = "python", // 추가
);
```

#### 4-c. 프롬프트 첫 줄 + JS 힌트 분기

```ts
const langLabel = language === "javascript" ? "JavaScript" : "Python";
const langSpecificHints =
  language === "javascript"
    ? [
        "JS 특화: Array.push/pop은 스택, shift/unshift는 큐, Map은 dict, Set은 set으로 인식.",
        "JS 특화: for...of 루프, forEach 고차 함수 패턴도 인식.",
        "JS 특화: deque 대신 배열+shift/push 조합으로 BFS 큐를 구현함.",
      ]
    : [
        "deque()는 반드시 자료구조로 감지하고 append+popleft면 queue/BFS 반영.",
        // 기존 Python 힌트 유지
      ];

const prompt = [
  `${langLabel} 코드의 자료구조/알고리즘 분류기다.`,
  ...langSpecificHints,
  // 나머지 공통 프롬프트 그대로
].join("\n");
```

#### 4-d. POST 핸들러에서 `analyzeWithAi` 호출 시 language 전달

```ts
const meta = await analyzeWithAi(code, varTypes, language);
```

#### 4-e. `page.tsx`에서 `/api/analyze` 호출 시 language 포함

```ts
body: JSON.stringify({ code, varTypes, language });
```

**STEP 4 완료 조건**: JS BFS 코드 입력 → AI가 `strategy: "GRAPH"` 또는 `"GRID_LINEAR"`로 올바르게 분류

---

### STEP 5 — (선택) `src/types/prova.ts` 타입 추가

**변경량**: +2줄

```ts
export type SupportedLanguage = "python" | "javascript";
```

`language` state와 `ProvaRuntime` 생성자 파라미터 타입에 `string` 대신 `SupportedLanguage` 적용.

---

### STEP 6 — (선택 / 나중에) `instrumentCode` → astring 기반으로 교체

**무엇을**: 오프셋 삽입 방식의 edge case 해결  
**참고**: 섹션 7  
**영향 범위**: `js.worker.js`의 `instrumentCode` 함수만 교체, 나머지 코드 변경 없음

```js
// Worker 상단에 astring 추가 로드
importScripts("https://cdn.jsdelivr.net/npm/astring@1.9.0/dist/astring.min.js");

// instrumentCode 함수를 AST 조작 + astring.generate(ast) 방식으로 재작성
// 단문 래핑, return 앞 삽입, switch 처리 포함 (섹션 7 코드 참고)
```

---

### 전체 체크리스트

```
[ ] STEP 1  public/worker/js.worker.js 생성 + 콘솔 테스트 통과
[ ] STEP 2  runtime.ts — language 파라미터, workerUrl 분기, stdin 검증 완화
[ ] STEP 3a page.tsx  — JavaScript 선택지 활성화
[ ] STEP 3b page.tsx  — language change effect (Worker 재생성)
[ ] STEP 3c page.tsx  — highlightJsLine 함수 추가
[ ] STEP 3d page.tsx  — 하이라이터 분기 (2군데)
[ ] STEP 3e page.tsx  — 노이즈 필터 + 뱃지 문구 분기
[ ] STEP 4  route.ts  — language 파라미터, 프롬프트 분기
[ ] STEP 5  prova.ts  — SupportedLanguage 타입 (선택)
[ ] STEP 6  js.worker.js — astring 기반 instrumentCode 교체 (선택, 나중에)
```
