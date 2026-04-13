import type { RawTraceStep, WorkerDonePayload, BranchLines } from "@/types/prova";

// ─── 타입 추론 (public/worker/js.worker.js inferType 와 동일 로직) ───────────

function inferType(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) return "list2d";
    return "list";
  }
  if (typeof value === "number")  return Number.isInteger(value) ? "int" : "float";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "string")  return "string";
  if (value === null)             return "none";
  if (typeof value === "object")  return "dict";
  return "object";
}

function extractVarTypesUnion(rawTrace: RawTraceStep[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const step of rawTrace) {
    for (const [key, value] of Object.entries(step.vars ?? {})) {
      if (!result[key]) result[key] = inferType(value);
    }
  }
  return result;
}

// ─── 컴파일 에러 파싱 ─────────────────────────────────────────────────────────

// "Main.java:12: error: ';' expected"
// "Main.java:12: 오류: ';'이 필요합니다"
// "Foo.java:12: error: ';' expected"
// "/tmp/tmpabc.java:12: error: ';' expected"
const COMPILE_ERROR_RE = /^(?:.+\/)?[^:\n]+\.java:(\d+):\s*(?:error|오류)\s*:?\s*(.+)/m;
const COMPILE_LINE_ONLY_RE = /^(?:.+\/)?[^:\n]+\.java:(\d+):/m;

function parseCompileError(stderr: string) {
  const match = stderr.match(COMPILE_ERROR_RE);
  if (!match) {
    const lineOnly = stderr.match(COMPILE_LINE_ONLY_RE);
    if (!lineOnly) return null;
    const firstNonEmpty = stderr
      .split("\n")
      .map((s) => s.trim())
      .find((s) => s.length > 0) ?? "컴파일 오류";
    return {
      type: "CompileError",
      message: firstNonEmpty,
      line: parseInt(lineOnly[1], 10),
    };
  }
  return {
    type:    "CompileError",
    message: match[2].trim(),
    line:    parseInt(match[1], 10),
  };
}

// ─── 런타임 에러 파싱 ──────────────────────────────────────────────────────────

// "Exception in thread "main" java.lang.NullPointerException: ..."
const EXCEPTION_RE = /^(?:Exception in thread\s+"\w+"?\s+)?(\w[\w.]*Exception[\w.]*):\s*(.*)/m;
const AT_LINE_RE   = /\bat\s+[\w.$]+\.main\([^:\n]+\.java:(\d+)\)/;

function parseRuntimeError(stderr: string, fallbackLine: number, resultLineMap?: number[]) {
  const exMatch = stderr.match(EXCEPTION_RE);
  if (!exMatch) return null;

  const lineMatch = stderr.match(AT_LINE_RE);
  const rawLine = lineMatch ? parseInt(lineMatch[1], 10) : null;
  // AT_LINE_RE가 주는 라인은 계기화 코드 기준 → resultLineMap으로 역매핑
  const line = rawLine && resultLineMap
    ? (resultLineMap[rawLine - 1] ?? fallbackLine)
    : (rawLine ?? fallbackLine);

  return {
    type:    exMatch[1].split(".").pop() ?? exMatch[1],
    message: exMatch[2].trim(),
    line,
  };
}

// ─── 컴파일 에러 → WorkerDonePayload ──────────────────────────────────────────

/**
 * 컴파일 에러를 runtimeError가 붙은 단일 step trace로 변환한다.
 * route.ts에서 status 400 대신 이 payload를 200으로 반환해
 * 에디터가 에러 라인을 하이라이트할 수 있게 한다.
 */
export function parseJavaCompileErrorPayload(stderr: string, resultLineMap?: number[]): WorkerDonePayload {
  const raw = parseCompileError(stderr);
  const compileError = raw
    ? {
        type:    raw.type,
        message: raw.message,
        // 계기화 코드 라인 → 원본 라인으로 역매핑
        line:    resultLineMap ? (resultLineMap[raw.line - 1] ?? raw.line) : raw.line,
      }
    : {
        type: "CompileError",
        message:
          stderr
            .split("\n")
            .map((s) => s.trim())
            .find((s) => s.length > 0) ?? "컴파일 오류",
        line: 1,
      };

  const step: RawTraceStep = {
    step:          0,
    line:          compileError.line,
    vars:          {},
    scope:         { func: "main", depth: 0 },
    parent_frames: [],
    stdout:        [],
    runtimeError:  compileError,
  };

  return { rawTrace: [step], branchLines: { loop: [], branch: [] }, varTypes: {} };
}

// ─── 메인 파서 ─────────────────────────────────────────────────────────────────

interface ParseLimits {
  maxTraceSteps?: number;
}

/**
 * Java 실행 서버의 stderr(트레이스 JSON 라인) + stdout(사용자 출력)을
 * WorkerDonePayload 로 변환한다.
 *
 * stderr 각 라인 포맷: {"step":N,"line":N,"vars":{...}}
 * stdout: 사용자 System.out 출력 전체 (마지막 step 에 붙임)
 */
export function parseJavaTrace(
  stderr: string,
  stdout: string,
  limits?: ParseLimits,
  resultLineMap?: number[],
): WorkerDonePayload {
  const maxSteps = limits?.maxTraceSteps ?? 10_000;
  const rawTrace: RawTraceStep[] = [];

  for (const raw of stderr.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) continue;

    try {
      const parsed = JSON.parse(trimmed) as {
        step: number;
        line: number;
        func?: string;
        depth?: number;
        vars: Record<string, unknown>;
      };

      rawTrace.push({
        step:          parsed.step,
        line:          parsed.line,
        vars:          parsed.vars ?? {},
        scope:         { func: parsed.func ?? "main", depth: parsed.depth ?? 0 },
        parent_frames: [],
        stdout:        [],
        runtimeError:  null,
      });
    } catch {
      // 파싱 실패 라인 무시 (컴파일 에러·Exception 스택트레이스 등)
    }

    if (rawTrace.length >= maxSteps) break;
  }

  // 트레이스가 하나도 없으면 더미 step 하나 생성
  // (stdout만 있는 경우 — 예: System.out.println 만 있는 코드)
  if (rawTrace.length === 0) {
    rawTrace.push({
      step:          0,
      line:          1,
      vars:          {},
      scope:         { func: "main", depth: 0 },
      parent_frames: [],
      stdout:        [],
      runtimeError:  null,
    });
  }

  // stdout 전체를 마지막 step에 붙임
  const lastStep = rawTrace[rawTrace.length - 1];
  lastStep.stdout = stdout.split("\n").filter(Boolean);

  // 런타임 에러
  const runtimeError = parseRuntimeError(stderr, lastStep.line, resultLineMap);
  if (runtimeError) lastStep.runtimeError = runtimeError;

  const varTypes: Record<string, string>  = extractVarTypesUnion(rawTrace);
  const branchLines: BranchLines          = { loop: [], branch: [] };

  // I/O 유틸리티 변수(Scanner, StringTokenizer, BufferedReader 등)를 varTypes에서 제거
  // — value 패턴으로 판단하며 변수명에 의존하지 않는다
  const JAVA_IO_RE = /^java\.(util\.(Scanner|StringTokenizer)\b|io\.(Buffered(?:Reader|Writer)|InputStreamReader|PrintWriter|StreamTokenizer)\b)/;
  for (const step of rawTrace) {
    for (const [key, val] of Object.entries(step.vars ?? {})) {
      if (typeof val === "string" && JAVA_IO_RE.test(val)) {
        delete varTypes[key];
      }
    }
  }

  return { rawTrace, branchLines, varTypes };
}
