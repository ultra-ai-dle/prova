/* eslint-disable no-restricted-globals */

let pyodideReadyPromise = null;
let pyodide = null;

function inferType(value) {
  if (Array.isArray(value) && Array.isArray(value[0])) return "list2d";
  if (Array.isArray(value)) return "list";
  if (typeof value === "number") return "int";
  if (typeof value === "boolean") return "bool";
  if (value === null) return "none";
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

async function ensurePyodideReady() {
  if (pyodide) return pyodide;
  if (!pyodideReadyPromise) {
    pyodideReadyPromise = (async () => {
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
      pyodide = await self.loadPyodide({});
      self.postMessage({ type: "ready" });
      return pyodide;
    })();
  }
  return pyodideReadyPromise;
}

function provaPositiveInt(value, fallback) {
  const x = Math.floor(Number(value));
  return Number.isFinite(x) && x > 0 ? x : fallback;
}

/** limits는 src/config/provaRuntime.ts 와 동기화되는 기본값을 둔다. */
async function runWithTrace(code, stdin, limits = {}) {
  const maxTraceSteps = provaPositiveInt(limits.maxTraceSteps, 10000);
  const safeL0 = provaPositiveInt(limits.safeSerializeListLimitRoot, 30);
  const safeLN = provaPositiveInt(limits.safeSerializeListLimitNested, 12);

  const runtime = await ensurePyodideReady();
  runtime.globals.set("__prova_code", String(code));
  runtime.globals.set("__prova_stdin", String(stdin ?? ""));

  const resultJson = await runtime.runPythonAsync(`
import json
import sys
import traceback
import types
import ast
import collections
import math

_prova_code = __prova_code
_prova_stdin = __prova_stdin

class _ProvaStdin:
    def __init__(self, text):
        self.lines = text.splitlines(True)
        self.idx = 0
    def readline(self):
        if self.idx >= len(self.lines):
            return ""
        v = self.lines[self.idx]
        self.idx += 1
        return v

_stdout_buffer = ""
_stdout_lines = []
_NOISY_OUTPUT_MARKERS = [
    "RuntimeWarning: assigning None to unbound local '_'",
]
def _refresh_stdout_lines():
    global _stdout_lines
    lines = [line for line in _stdout_buffer.splitlines() if line != ""]
    _stdout_lines = [
        line for line in lines
        if not any(marker in line for marker in _NOISY_OUTPUT_MARKERS)
    ]

class _ProvaStdout:
    def write(self, s):
        global _stdout_buffer
        _stdout_buffer += str(s)
        _refresh_stdout_lines()
    def flush(self):
        return None

sys.stdin = _ProvaStdin(_prova_stdin)
sys.stdout = _ProvaStdout()
sys.stderr = _ProvaStdout()

_trace = []
_step = 0
_last_line = 0
_trace_disabled = False
_trace_truncated = False
_MAX_TRACE_STEPS = ${maxTraceSteps}
_PROVA_SAFE_L0 = ${safeL0}
_PROVA_SAFE_LN = ${safeLN}

def _collect_user_symbols(src):
    symbols = set()
    try:
        tree = ast.parse(src)
    except Exception:
        return symbols

    def _collect_target(target):
        if isinstance(target, ast.Name):
            symbols.add(target.id)
            return
        if isinstance(target, (ast.Tuple, ast.List)):
            for elt in target.elts:
                _collect_target(elt)

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            symbols.add(node.name)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                _collect_target(t)
        elif isinstance(node, ast.AnnAssign):
            _collect_target(node.target)
        elif isinstance(node, ast.AugAssign):
            _collect_target(node.target)
        elif isinstance(node, ast.For):
            _collect_target(node.target)
        elif isinstance(node, ast.With):
            for item in node.items:
                if item.optional_vars is not None:
                    _collect_target(item.optional_vars)
        elif isinstance(node, ast.ExceptHandler):
            if isinstance(node.name, str):
                symbols.add(node.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                symbols.add((alias.asname or alias.name.split(".")[0]))
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name == "*":
                    continue
                symbols.add((alias.asname or alias.name))
    return symbols

_USER_SYMBOLS = _collect_user_symbols(_prova_code)

def _safe(v, depth=0):
    if v is None or isinstance(v, (bool, int, float, str)):
        if isinstance(v, float) and not math.isfinite(v):
            if math.isnan(v):
                return "NaN"
            return "Infinity" if v > 0 else "-Infinity"
        return v
    if depth > 2:
        return repr(v)
    if isinstance(v, (list, tuple, set, collections.deque)):
        arr = list(v)
        # Keep full key-mask vectors (visited[r][c][0..63]) for projection UI.
        # This is value-shape based (bool-ish list), not variable-name based.
        boolish_vector = (
            depth >= 2
            and len(arr) > 0
            and len(arr) <= 128
            and all(isinstance(x, (bool, int)) for x in arr)
        )
        limit = len(arr) if boolish_vector else (_PROVA_SAFE_L0 if depth == 0 else _PROVA_SAFE_LN)
        sliced = arr[:limit]
        mapped = [_safe(x, depth + 1) for x in sliced]
        if len(arr) > limit:
            mapped.append(f"...(+{len(arr) - limit})")
        return mapped
    if isinstance(v, dict):
        out = {}
        count = 0
        limit = _PROVA_SAFE_L0 if depth == 0 else _PROVA_SAFE_LN
        for k, val in v.items():
            if count >= limit:
                break
            out[str(_safe(k, depth + 1))] = _safe(val, depth + 1)
            count += 1
        if len(v) > limit:
            out["..."] = f"+{len(v) - limit} items"
        return out
    return repr(v)

def _should_skip_local(name, value, *, require_user_symbol=False):
    if name.startswith("__"):
        return True
    if name in {"stdin", "input", "print"}:
        return True
    if require_user_symbol and name not in _USER_SYMBOLS:
        return True
    if isinstance(value, (_ProvaStdin, _ProvaStdout)):
        return True
    if isinstance(value, types.ModuleType):
        return True
    if isinstance(value, type):
        return True
    if isinstance(value, (types.BuiltinFunctionType, types.BuiltinMethodType, types.MethodType, types.FunctionType)):
        return True
    if callable(value):
        return True
    # Bound-method repr noise such as "<bound method _ProvaStdin.readline ...>"
    text = repr(value)
    if "_ProvaStdin" in text or "_ProvaStdout" in text:
        return True
    return False

def _frame_depth(frame):
    depth = 0
    cur = frame
    while cur is not None:
        depth += 1
        cur = cur.f_back
    return depth

def _tracer(frame, event, arg):
    global _step, _last_line, _trace_disabled, _trace_truncated
    if _trace_disabled:
        return None
    if frame.f_code.co_filename != "<prova_user_code>":
        return _tracer
    if event not in ("line", "call"):
        return _tracer

    if _step >= _MAX_TRACE_STEPS:
        _trace_disabled = True
        _trace_truncated = True
        return None

    # Emit explicit call-site step so one-line calls like
    # "for i in truth: dfs(i)" are visible in step navigation.
    if event == "call" and frame.f_back is not None and frame.f_back.f_code.co_filename == "<prova_user_code>":
        caller_locals = {}
        for ck, cv in frame.f_back.f_locals.items():
            if _should_skip_local(ck, cv):
                continue
            caller_locals[ck] = _safe(cv)
        _trace.append({
            "step": _step,
            "line": int(frame.f_back.f_lineno),
            "vars": caller_locals,
            "scope": { "func": frame.f_back.f_code.co_name, "depth": _frame_depth(frame.f_back) },
            "parent_frames": [],
            "stdout": list(_stdout_lines),
            "runtimeError": None,
            "event": "callsite"
        })
        _last_line = int(frame.f_back.f_lineno)
        _step += 1

    locals_map = {}
    is_module_scope = frame.f_code.co_name == "<module>"
    # 1) frame locals (function-local state)
    for k, v in frame.f_locals.items():
        if _should_skip_local(k, v, require_user_symbol=is_module_scope):
            continue
        locals_map[k] = _safe(v)
    # 2) user globals (keep visualization structures visible inside function scope)
    for gk, gv in frame.f_globals.items():
        if gk in locals_map:
            continue
        if _should_skip_local(gk, gv, require_user_symbol=True):
            continue
        locals_map[gk] = _safe(gv)

    _trace.append({
        "step": _step,
        "line": int(frame.f_lineno),
        "vars": locals_map,
        "scope": { "func": frame.f_code.co_name, "depth": _frame_depth(frame) },
        "parent_frames": [],
        "stdout": list(_stdout_lines),
        "runtimeError": None
    })
    _last_line = int(frame.f_lineno)
    _step += 1
    return _tracer

# step 0: before execution
_trace.append({
    "step": 0,
    "line": 0,
    "vars": {},
    "scope": { "func": "<global>", "depth": 1 },
    "parent_frames": [],
    "stdout": [],
    "runtimeError": None
})
_step = 1

try:
    compiled = compile(_prova_code, "<prova_user_code>", "exec")
    glb = {"__name__": "__main__"}
    sys.settrace(_tracer)
    exec(compiled, glb, glb)
    final_vars = {}
    for k, v in glb.items():
        if _should_skip_local(k, v, require_user_symbol=True):
            continue
        final_vars[k] = _safe(v)
    _trace.append({
        "step": _step,
        "line": _last_line,
        "vars": final_vars,
        "scope": { "func": "<global>", "depth": 1 },
        "parent_frames": [],
        "stdout": list(_stdout_lines),
        "runtimeError": None
    })
    if _trace_truncated:
        truncated_stdout = list(_stdout_lines)
        truncated_stdout.append("[warn] 추적 단계 한도를 초과해 일부 단계가 생략되었습니다.")
        _trace.append({
            "step": _step + 1,
            "line": _last_line,
            "vars": final_vars,
            "scope": { "func": "<global>", "depth": 1 },
            "parent_frames": [],
            "stdout": truncated_stdout,
            "runtimeError": None
        })
except BaseException as e:
    tb = traceback.extract_tb(e.__traceback__)
    line_no = 0
    for t in reversed(tb):
        if t.filename == "<prova_user_code>":
            line_no = int(t.lineno)
            break
    if e.__class__.__name__ == "SystemExit":
        _trace.append({
            "step": _step,
            "line": line_no if line_no else _last_line,
            "vars": {},
            "scope": { "func": "<global>", "depth": 1 },
            "parent_frames": [],
            "stdout": list(_stdout_lines),
            "runtimeError": None
        })
    else:
        _trace.append({
            "step": _step,
            "line": line_no,
            "vars": {},
            "scope": { "func": "<global>", "depth": 1 },
            "parent_frames": [],
            "stdout": list(_stdout_lines),
            "runtimeError": {
                "type": e.__class__.__name__,
                "message": str(e),
                "line": line_no
            }
        })
finally:
    sys.settrace(None)

try:
    _result_json = json.dumps({"rawTrace": _trace})
except Exception as _ser_err:
    _result_json = json.dumps({
        "rawTrace": [{
            "step": 0,
            "line": 0,
            "vars": {},
            "scope": {"func": "<global>", "depth": 1},
            "parent_frames": [],
            "stdout": [],
            "runtimeError": {
                "type": _ser_err.__class__.__name__,
                "message": "트레이스 JSON 직렬화 실패: " + str(_ser_err),
                "line": 0
            }
        }]
    })
_result_json
  `);

  const parsed = JSON.parse(String(resultJson));
  return parsed.rawTrace ?? [];
}

self.onmessage = async (event) => {
  const { code = "", stdin = "", limits = {} } = event.data || {};
  if (String(code).trim().length === 0) {
    self.postMessage({
      type: "invalid_input",
      message: "코드를 입력한 후 디버깅을 시작하세요."
    });
    return;
  }
  if (String(stdin).trim().length === 0) {
    self.postMessage({
      type: "invalid_input",
      message: "예시 입력(stdin)을 입력한 후 디버깅을 시작하세요."
    });
    return;
  }

  try {
    const rawTrace = await runWithTrace(code, stdin, limits);
    const varTypes = extractVarTypesUnion(rawTrace);
    self.postMessage({
      type: "done",
      rawTrace,
      branchLines: { loop: [], branch: [] },
      varTypes
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
        : String(error);
    self.postMessage({
      type: "done",
      rawTrace: [
        {
          step: 0,
          line: 0,
          vars: {},
          scope: { func: "<global>", depth: 1 },
          parent_frames: [],
          stdout: [],
          runtimeError: {
            type: "WorkerError",
            message,
            line: 0
          }
        }
      ],
      branchLines: { loop: [], branch: [] },
      varTypes: {}
    });
  }
};

// Kick off runtime loading immediately.
ensurePyodideReady();
