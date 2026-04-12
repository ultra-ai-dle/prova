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

def _collect_init_lines(src):
    """
    초기화 전용 list/dict comprehension 라인 번호를 수집한다.
    조건: 변수에 직접 할당되고, 가장 바깥 루프가 range() 이고,
         루프 변수가 결과 표현식에서 인덱스/키로만 쓰이거나 전혀 안 쓰이면 초기화로 간주.
    예: new_board = [[] for _ in range(n)]
        dp = [[0]*m for _ in range(n)]
        visited = [False]*n  ← 이건 listcomp 아니라 괜찮
    """
    init_lines = set()
    try:
        tree = ast.parse(src)
    except Exception:
        return init_lines

    def _uses_only_as_index(loop_var, elt_node):
        """루프 변수가 elt_node 안에서 단순 인덱스로만 쓰이거나 전혀 안 쓰이는지"""
        if not isinstance(loop_var, ast.Name):
            return True  # tuple/starred → 복잡하므로 패스
        vname = loop_var.id
        if vname == "_":
            return True  # 무시 변수
        # elt 안에서 Name(vname) 등장 여부
        for n in ast.walk(elt_node):
            if isinstance(n, ast.Name) and n.id == vname:
                return False
        return True  # 루프 변수가 elt에서 전혀 안 쓰임 → 초기화

    def _is_range_iter(iter_node):
        """이터레이터가 range(...)인지"""
        if isinstance(iter_node, ast.Call):
            func = iter_node.func
            if isinstance(func, ast.Name) and func.id == "range":
                return True
            if isinstance(func, ast.Attribute) and func.attr == "range":
                return True
        return False

    def _is_init_listcomp(node):
        """ListComp 노드가 초기화 전용인지"""
        if not isinstance(node, ast.ListComp):
            return False
        # 가장 바깥 generator
        gen = node.generators[0]
        if not _is_range_iter(gen.iter):
            return False
        if gen.ifs:  # 조건 필터 있으면 알고리즘 로직
            return False
        # elt(결과 표현식)를 본다
        elt = node.elt
        # elt 자체가 다시 ListComp → 중첩 초기화 (재귀 확인)
        if isinstance(elt, ast.ListComp):
            return _is_init_listcomp(elt)
        # elt가 상수/이름/단순 연산 → 초기화
        # elt 안에서 바깥 루프 변수가 단순히 안 쓰이면 OK
        return _uses_only_as_index(gen.target, elt)

    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
            # 할당의 value 가져오기
            if isinstance(node, ast.Assign):
                val = node.value
            elif isinstance(node, ast.AnnAssign):
                val = node.value
            else:
                val = node.value
            if val is None:
                continue
            if _is_init_listcomp(val) and hasattr(val, "lineno"):
                init_lines.add(val.lineno)
    return init_lines

_INIT_LINES = _collect_init_lines(_prova_code)
# listcomp/genexpr 프레임 안에 있고 호출자 라인이 초기화 라인이면 skip
_init_frame_key = None  # (caller_lineno, caller_func) — 현재 skip 중인 init 프레임 식별자

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
    global _step, _last_line, _trace_disabled, _trace_truncated, _init_frame_key
    if _trace_disabled:
        return None
    if frame.f_code.co_filename != "<prova_user_code>":
        return _tracer
    if event not in ("line", "call", "return"):
        return _tracer

    # ── Init-listcomp skip logic ──────────────────────────────────────────────
    # 현재 프레임이 <listcomp>/<genexpr>/<setcomp>/<dictcomp>이고
    # 호출자 라인이 초기화 라인인 경우 이 프레임 내부 이벤트를 전부 무시.
    fname = frame.f_code.co_name
    _is_comp_frame = fname in ("<listcomp>", "<genexpr>", "<setcomp>", "<dictcomp>")

    if _is_comp_frame:
        # 호출자 라인 번호로 초기화 여부 판단
        caller_line = frame.f_back.f_lineno if frame.f_back else -1
        key = (caller_line, frame.f_back.f_code.co_name if frame.f_back else "")
        if caller_line in _INIT_LINES:
            # 진입: init 프레임 키 설정
            if event == "call":
                _init_frame_key = key
            # 이 프레임 안의 모든 이벤트 skip
            if _init_frame_key == key:
                if event == "return":
                    _init_frame_key = None  # 프레임 종료 — 부모에서 결과 step 찍음
                return _tracer
        # INIT_LINES에 없는 comp 프레임은 정상 추적 (실제 알고리즘 로직)

    # ── Return event ─────────────────────────────────────────────────────────
    if event == "return":
        func_name = frame.f_code.co_name
        if func_name not in ("<module>", "<lambda>", "<listcomp>", "<genexpr>", "<setcomp>", "<dictcomp>") and not _trace_truncated:
            _trace.append({
                "step": _step,
                "line": int(frame.f_lineno),
                "vars": {},
                "scope": { "func": func_name, "depth": _frame_depth(frame) },
                "parent_frames": [],
                "stdout": list(_stdout_lines),
                "runtimeError": None,
                "event": "return",
                "returnValue": _safe(arg)
            })
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
