/* eslint-disable no-restricted-globals */

// ─── 타입 추론 (pyodide.worker.js와 동일) ────────────────────────────────────

function inferType(value) {
  if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) return "list2d";
  if (Array.isArray(value)) return "list";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "int" : "float";
  }
  if (typeof value === "boolean") return "bool";
  if (typeof value === "string") return "string";
  if (value === null || value === undefined) return "none";
  if (value instanceof Map) return "dict";
  if (value instanceof Set) return "list";
  return typeof value;
}

function extractVarTypesUnion(rawTrace) {
  const result = {};
  rawTrace.forEach((step) => {
    Object.entries(step.vars || {}).forEach(([key, value]) => {
      if (!result[key]) {
        result[key] = inferType(value);
      }
    });
  });
  return result;
}

// ─── 변수 직렬화 ──────────────────────────────────────────────────────────────

function _safeJs(value, depth, safeL0, safeLN) {
  if (depth === undefined) depth = 0;
  if (safeL0 === undefined) safeL0 = 30;
  if (safeLN === undefined) safeLN = 12;

  if (depth > 2) return String(value);
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";
    return value;
  }

  const limit = depth === 0 ? safeL0 : safeLN;

  if (Array.isArray(value)) {
    const len = Math.min(value.length, limit);
    const sliced = [];
    for (let idx = 0; idx < len; idx++) {
      // sparse 배열의 hole(empty slot)은 null로 표시
      sliced.push(idx in value ? _safeJs(value[idx], depth + 1, safeL0, safeLN) : null);
    }
    if (value.length > limit) sliced.push("...(+" + (value.length - limit) + ")");
    return sliced;
  }

  if (value instanceof Map) {
    const out = {};
    let count = 0;
    for (const [k, v] of value) {
      if (count >= limit) {
        out["..."] = "+" + (value.size - limit) + " items";
        break;
      }
      out[String(_safeJs(k, depth + 1, safeL0, safeLN))] = _safeJs(v, depth + 1, safeL0, safeLN);
      count++;
    }
    return out;
  }

  if (value instanceof Set) {
    return Array.from(value).slice(0, limit).map(function(v) {
      return _safeJs(v, depth + 1, safeL0, safeLN);
    });
  }

  if (typeof value === "object") {
    const out = {};
    let count = 0;
    const entries = Object.entries(value);
    for (const [k, v] of entries) {
      if (count >= limit) {
        out["..."] = "+" + (entries.length - limit) + " items";
        break;
      }
      out[k] = _safeJs(v, depth + 1, safeL0, safeLN);
      count++;
    }
    return out;
  }

  return String(value);
}

// ─── 심볼 추출 (Acorn AST) ────────────────────────────────────────────────────

function parseUserSymbols(code) {
  const symbols = new Set();
  let ast;
  try {
    ast = self.acorn.parse(code, { ecmaVersion: 2022, sourceType: "script" });
  } catch (e) {
    // 파싱 실패 시 빈 세트 반환 — 실행 단계에서 SyntaxError로 처리됨
    return symbols;
  }

  function collectPattern(node) {
    if (!node) return;
    if (node.type === "Identifier") { symbols.add(node.name); return; }
    if (node.type === "ArrayPattern") {
      node.elements.forEach(function(e) { collectPattern(e); });
      return;
    }
    if (node.type === "ObjectPattern") {
      node.properties.forEach(function(p) { collectPattern(p.value); });
      return;
    }
    if (node.type === "AssignmentPattern") {
      collectPattern(node.left);
      return;
    }
    if (node.type === "RestElement") {
      collectPattern(node.argument);
      return;
    }
  }

  function walk(node) {
    if (!node || typeof node !== "object") return;

    if (node.type === "VariableDeclaration") {
      node.declarations.forEach(function(decl) { collectPattern(decl.id); });
    }
    if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && node.id) {
      symbols.add(node.id.name);
      // 함수 파라미터도 수집
      node.params.forEach(function(p) { collectPattern(p); });
    }
    if (node.type === "ArrowFunctionExpression") {
      node.params.forEach(function(p) { collectPattern(p); });
    }
    if (node.type === "ClassDeclaration" && node.id) {
      symbols.add(node.id.name);
    }
    if ((node.type === "ForOfStatement" || node.type === "ForInStatement") && node.left) {
      if (node.left.type === "VariableDeclaration") {
        node.left.declarations.forEach(function(d) { collectPattern(d.id); });
      }
    }

    // 재귀적 walk
    for (const key of Object.keys(node)) {
      if (key === "type" || key === "start" || key === "end") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(function(c) { if (c && typeof c === "object" && c.type) walk(c); });
      } else if (child && typeof child === "object" && child.type) {
        walk(child);
      }
    }
  }

  walk(ast);
  return symbols;
}

// ─── 코드 계측 (오프셋 기반 __snap 삽입) ─────────────────────────────────────

function buildCaptureFunc(symbols) {
  const keys = Array.from(symbols).filter(function(s) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);
  });
  if (keys.length === 0) return "function(){return {};}";
  // 변수마다 개별 try-catch — 스코프에 없는 변수가 있어도 나머지는 정상 캡처
  const lines = keys.map(function(k) {
    return "try{_r['" + k + "']=" + k + ";}catch(_){}";
  });
  return "function(){var _r={};" + lines.join("") + "return _r;}";
}

function instrumentCode(code, symbols) {
  let ast;
  try {
    ast = self.acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true
    });
  } catch (e) {
    // 파싱 실패 — 계측 없이 원본 반환, 실행 시 SyntaxError 발생
    return code;
  }

  const captureFunc = buildCaptureFunc(symbols);
  // 삽입 포인트: { offset, text }[] — 역순으로 정렬해서 삽입
  const insertions = [];

  function snapText(line) {
    // trailing ';' 필수 — 같은 줄에 다음 statement가 이어질 때 SyntaxError 방지
    return "; __snap(" + line + ", " + captureFunc + "); ";
  }

  // inFuncName: 현재 순회 중인 함수명 (null이면 global scope)
  function visitStatements(body, inFuncName) {
    for (const stmt of body) {
      if (!stmt || !stmt.loc) continue;

      const line = stmt.loc.start.line;
      const endOffset = stmt.end;

      const isExit = stmt.type === "ReturnStatement"
        || stmt.type === "ThrowStatement"
        || stmt.type === "BreakStatement"
        || stmt.type === "ContinueStatement";

      if (isExit) {
        if (stmt.type === "ReturnStatement" && inFuncName !== null) {
          // return expr → __snapReturn(funcName, line, captureFunc, expr); return expr;
          const retExpr = stmt.argument
            ? code.slice(stmt.argument.start, stmt.argument.end)
            : "undefined";
          insertions.push({
            offset: stmt.start,
            text: "{ var __rv = (" + retExpr + "); __snapReturn(" + JSON.stringify(inFuncName) + ", " + line + ", " + captureFunc + ", __rv); return __rv; } if(false) "
          });
        } else {
          insertions.push({ offset: stmt.start, text: "__snap(" + line + ", " + captureFunc + "); " });
        }
      } else {
        insertions.push({ offset: endOffset, text: snapText(line) });
        visitNode(stmt, null, inFuncName);
      }
    }
  }

  // parentNode: 함수명 추론용, inFuncName: 현재 속한 함수명
  function visitNode(node, parentNode, inFuncName) {
    if (!node || typeof node !== "object") return;
    if (node.type === "BlockStatement") {
      visitStatements(node.body, inFuncName);
      return;
    }
    if (node.type === "IfStatement") {
      visitNode(node.consequent, null, inFuncName);
      if (node.alternate) visitNode(node.alternate, null, inFuncName);
      return;
    }
    if (
      node.type === "ForStatement" ||
      node.type === "ForOfStatement" ||
      node.type === "ForInStatement" ||
      node.type === "WhileStatement" ||
      node.type === "DoWhileStatement"
    ) {
      visitNode(node.body, null, inFuncName);
      return;
    }
    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      if (node.body && node.body.type === "BlockStatement") {
        // 함수명 결정: declaration id > expression id > 부모 맥락 > anonymous
        var funcName = "anonymous";
        if (node.id && node.id.name) {
          funcName = node.id.name;
        } else if (
          parentNode &&
          parentNode.type === "VariableDeclarator" &&
          parentNode.id &&
          parentNode.id.type === "Identifier"
        ) {
          funcName = parentNode.id.name;
        } else if (
          parentNode &&
          parentNode.type === "AssignmentExpression" &&
          parentNode.left &&
          parentNode.left.type === "Identifier"
        ) {
          funcName = parentNode.left.name;
        } else if (
          parentNode &&
          parentNode.type === "Property" &&
          parentNode.key &&
          parentNode.key.type === "Identifier"
        ) {
          funcName = parentNode.key.name;
        }
        var callLine = node.body.loc ? node.body.loc.start.line : 0;
        insertions.push({
          offset: node.body.start + 1,
          text: " __snapCall(" + JSON.stringify(funcName) + ", " + callLine + ", " + captureFunc + "); "
        });
        // 바디 내부 순회 — inFuncName을 이 함수명으로 교체
        visitStatements(node.body.body, funcName);
        // 암묵적 return: 바디 끝에 __snapReturn 삽입
        insertions.push({
          offset: node.body.end - 1,
          text: " __snapReturn(" + JSON.stringify(funcName) + ", " + node.body.loc.end.line + ", " + captureFunc + ", undefined); "
        });
      }
      return;
    }
    if (node.type === "TryStatement") {
      visitNode(node.block, null, inFuncName);
      if (node.handler) visitNode(node.handler.body, null, inFuncName);
      if (node.finalizer) visitNode(node.finalizer, null, inFuncName);
      return;
    }
    if (node.type === "SwitchStatement") {
      for (const sc of node.cases) {
        visitStatements(sc.consequent, inFuncName);
      }
      return;
    }
    if (node.type === "LabeledStatement") {
      visitNode(node.body, null, inFuncName);
      return;
    }
    if (node.type === "VariableDeclaration") {
      for (const decl of node.declarations) {
        if (decl.init) visitNode(decl.init, decl, inFuncName);
      }
      return;
    }
    if (node.type === "AssignmentExpression") {
      visitNode(node.right, node, inFuncName);
      return;
    }
  }

  // top-level: FunctionDeclaration은 __snap 삽입 없이 내부만 순회
  function visitTopLevel(body) {
    for (const stmt of body) {
      if (!stmt || !stmt.loc) continue;
      const line = stmt.loc.start.line;
      const endOffset = stmt.end;
      const isExit = stmt.type === "ReturnStatement"
        || stmt.type === "ThrowStatement"
        || stmt.type === "BreakStatement"
        || stmt.type === "ContinueStatement";
      if (isExit) {
        insertions.push({ offset: stmt.start, text: "__snap(" + line + ", " + captureFunc + "); " });
      } else if (stmt.type === "FunctionDeclaration") {
        visitNode(stmt, null, null);
      } else {
        insertions.push({ offset: endOffset, text: snapText(line) });
        visitNode(stmt, null, null);
      }
    }
  }

  visitTopLevel(ast.body);

  // 역순 삽입 (앞쪽 오프셋이 밀리지 않도록)
  insertions.sort(function(a, b) { return b.offset - a.offset; });
  let result = code;
  for (const ins of insertions) {
    result = result.slice(0, ins.offset) + ins.text + result.slice(ins.offset);
  }
  return result;
}

// ─── 에러 라인 추출 ───────────────────────────────────────────────────────────

function extractErrorLine(err) {
  // V8 스택 트레이스에서 "<anonymous>:N:M" 패턴 탐색
  const stack = (err && err.stack) ? err.stack : "";
  const m = stack.match(/<anonymous>:(\d+):/);
  if (m) return parseInt(m[1], 10);
  // Firefox: "Function code:N:M"
  const m2 = stack.match(/Function code:(\d+):/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

// ─── 샌드박스 실행 ────────────────────────────────────────────────────────────

function executeInSandbox(instrumentedCode, stdin, limits) {
  const maxSteps = (limits && limits.maxTraceSteps) ? limits.maxTraceSteps : 10000;
  const safeL0 = (limits && limits.safeSerializeListLimitRoot) ? limits.safeSerializeListLimitRoot : 30;
  const safeLN = (limits && limits.safeSerializeListLimitNested) ? limits.safeSerializeListLimitNested : 12;

  const trace = [];
  let step = 0;
  let truncated = false;
  const stdoutLines = [];

  // step 0: 실행 전 초기 상태
  trace.push({
    step: 0,
    line: 0,
    vars: {},
    scope: { func: "<global>", depth: 1 },
    parent_frames: [],
    stdout: [],
    runtimeError: null
  });
  step = 1;

  // 콜스택: { func, depth } — push on call, pop on return
  const callStack = [];

  function currentScope() {
    return callStack.length > 0
      ? callStack[callStack.length - 1]
      : { func: "<global>", depth: 1 };
  }

  function captureVars(captureThunk) {
    let rawVars = {};
    try { rawVars = captureThunk(); } catch (e) { /* 캡처 실패 무시 */ }
    const vars = {};
    for (const [k, v] of Object.entries(rawVars)) {
      if (v === undefined) continue;
      if (typeof v === "function") continue;
      vars[k] = _safeJs(v, 0, safeL0, safeLN);
    }
    return vars;
  }

  function __snap(line, captureThunk) {
    if (truncated) return;
    if (step >= maxSteps) { truncated = true; return; }
    trace.push({
      step: step++,
      line: line,
      event: "line",
      vars: captureVars(captureThunk),
      scope: currentScope(),
      parent_frames: callStack.slice(0, -1),
      stdout: stdoutLines.slice(),
      runtimeError: null
    });
  }

  function __snapCall(funcName, line, captureThunk) {
    if (truncated) return;
    if (step >= maxSteps) { truncated = true; return; }
    callStack.push({ func: funcName, depth: callStack.length + 2 });
    trace.push({
      step: step++,
      line: line,
      event: "call",
      vars: captureVars(captureThunk),
      scope: currentScope(),
      parent_frames: callStack.slice(0, -1),
      stdout: stdoutLines.slice(),
      runtimeError: null
    });
  }

  function __snapReturn(funcName, line, captureThunk, returnValue) {
    if (truncated) return;
    const scope = currentScope();
    trace.push({
      step: step++,
      line: line,
      event: "return",
      vars: captureVars(captureThunk),
      scope: scope,
      parent_frames: callStack.slice(0, -1),
      stdout: stdoutLines.slice(),
      runtimeError: null,
      returnValue: returnValue
    });
    if (callStack.length > 0) callStack.pop();
  }

  // console.log 리다이렉트
  const fakeConsole = {
    log: function() {
      const args = Array.prototype.slice.call(arguments);
      stdoutLines.push(args.map(String).join(" "));
    },
    warn: function() {
      const args = Array.prototype.slice.call(arguments);
      stdoutLines.push("[warn] " + args.map(String).join(" "));
    },
    error: function() {
      const args = Array.prototype.slice.call(arguments);
      stdoutLines.push("[error] " + args.map(String).join(" "));
    },
    info: function() {
      const args = Array.prototype.slice.call(arguments);
      stdoutLines.push(args.map(String).join(" "));
    }
  };

  // readline (stdin 한 줄씩 읽기)
  const stdinLines = String(stdin || "").split("\n");
  let stdinIdx = 0;
  function fakeReadline() {
    return stdinLines[stdinIdx++] !== undefined ? stdinLines[stdinIdx - 1] : "";
  }

  // require 모킹 — fs 모듈만 지원 (readFileSync(0)으로 stdin 읽기)
  const stdinFull = String(stdin || "");
  function fakeRequire(mod) {
    if (mod === "fs") {
      return {
        readFileSync: function(fd) {
          // fd 0 또는 '/dev/stdin' → stdin 전체 반환
          if (fd === 0 || fd === "/dev/stdin") return stdinFull;
          return "";
        }
      };
    }
    throw new Error("Cannot require '" + mod + "' in Prova sandbox. Use readline() for stdin.");
  }

  try {
    // new Function으로 격리된 컨텍스트에서 실행
    // __snap, console, readline, require 를 외부에서 주입
    // eslint-disable-next-line no-new-func
    const fn = new Function("__snap", "__snapCall", "__snapReturn", "console", "readline", "require", instrumentedCode);
    fn(__snap, __snapCall, __snapReturn, fakeConsole, fakeReadline, fakeRequire);

    // 실행 완료 — 최종 상태 추가
    const lastStep = trace[trace.length - 1];
    const finalVars = lastStep ? Object.assign({}, lastStep.vars) : {};
    const finalStdout = stdoutLines.slice();
    if (truncated) {
      finalStdout.push("[warn] 추적 단계 한도를 초과해 일부 단계가 생략되었습니다.");
    }
    trace.push({
      step: step,
      line: lastStep ? lastStep.line : 0,
      vars: finalVars,
      scope: { func: "<global>", depth: 1 },
      parent_frames: [],
      stdout: finalStdout,
      runtimeError: null
    });
  } catch (err) {
    const lastStep = trace[trace.length - 1];
    const lineNo = lastStep ? lastStep.line : (extractErrorLine(err) || 0);
    trace.push({
      step: step,
      line: lineNo,
      vars: lastStep ? Object.assign({}, lastStep.vars) : {},
      scope: { func: "<global>", depth: 1 },
      parent_frames: [],
      stdout: stdoutLines.slice(),
      runtimeError: {
        type: err.constructor ? err.constructor.name : "Error",
        message: err.message || String(err),
        line: lineNo
      }
    });
  }

  return trace;
}

// ─── Acorn 로드 & 메시지 핸들러 ──────────────────────────────────────────────

let acornReady = false;

function ensureAcorn() {
  if (acornReady) return;
  try {
    importScripts("https://cdn.jsdelivr.net/npm/acorn@8.14.1/dist/acorn.min.js");
    acornReady = true;
    self.postMessage({ type: "ready" });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: "Acorn 로드 실패: " + String(e)
    });
  }
}

self.onmessage = function(event) {
  const data = event.data || {};
  const code = String(data.code || "");
  const stdin = String(data.stdin || "");
  const limits = data.limits || {};

  ensureAcorn();

  if (!code.trim()) {
    self.postMessage({
      type: "invalid_input",
      message: "코드를 입력한 후 디버깅을 시작하세요."
    });
    return;
  }

  let rawTrace;
  try {
    const symbols = parseUserSymbols(code);
    const instrumented = instrumentCode(code, symbols);
    rawTrace = executeInSandbox(instrumented, stdin, limits);
  } catch (err) {
    rawTrace = [{
      step: 0,
      line: 0,
      vars: {},
      scope: { func: "<global>", depth: 1 },
      parent_frames: [],
      stdout: [],
      runtimeError: {
        type: "WorkerError",
        message: String(err),
        line: 0
      }
    }];
  }

  const varTypes = extractVarTypesUnion(rawTrace);
  self.postMessage({
    type: "done",
    rawTrace: rawTrace,
    branchLines: { loop: [], branch: [] },
    varTypes: varTypes
  });
};

// Worker 생성 즉시 Acorn 로드 시작
ensureAcorn();
