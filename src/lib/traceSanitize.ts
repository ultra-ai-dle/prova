import { RawTraceStep } from "@/types/prova";
import { JAVA_KEYWORDS } from "@/lib/languageDetection";

export const BLOCKED_RUNTIME_VAR_NAMES = new Set([
  "modules",
  "version",
  "hexversion",
  "api_version",
  "copyright",
  "platform",
  "maxsize",
  "float_info",
  "int_info",
  "hash_info",
  "maxunicode",
  "builtin_module_names",
  "stdlib_module_names",
  "byteorder",
  "thread_info",
  "meta_path",
  "path_importer_cache",
  "path_hooks",
  "path",
  "argv",
  "orig_argv",
  "warnoptions",
  "executable",
  "prefix",
  "base_prefix",
  "exec_prefix",
  "base_exec_prefix",
  "pycache_prefix",
]);

export function isRuntimeNoiseVar(name: string, value: unknown, language = "python") {
  const key = name.trim();
  if (key.startsWith("__")) return true;
  if (language === "javascript") {
    if (["console", "readline", "arguments", "fs"].includes(key)) return true;
    return false;
  }
  if (language === "java") {
    if (key.startsWith("$") || ["this", "class", "super"].includes(key))
      return true;
    // I/O 유틸리티 객체 — Scanner, BufferedReader 등 (변수명 무관, value 패턴으로 판단)
    const text = typeof value === "string" ? value : "";
    if (/^java\.(util\.Scanner\b|io\.(Buffered(?:Reader|Writer)|InputStreamReader|PrintWriter|StreamTokenizer)\b)/.test(text))
      return true;
    return false;
  }
  // Python 전용 필터
  if (BLOCKED_RUNTIME_VAR_NAMES.has(key)) return true;
  if (/(^_|import|frozen|zipimport|built-?in|site-packages|python3)/i.test(key))
    return true;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (
    typeof text === "string" &&
    /<module '|zipimporter|_frozen_importlib|built-in\)|site-packages/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

export function sanitizeRawTrace(
  rawTrace: RawTraceStep[],
  language = "python",
): RawTraceStep[] {
  return rawTrace.map((step) => {
    const vars = Object.fromEntries(
      Object.entries(step.vars || {}).filter(
        ([name, value]) => !isRuntimeNoiseVar(name, value, language),
      ),
    );
    return { ...step, vars };
  });
}

export function sanitizeVarTypes(
  varTypes: Record<string, string>,
  language = "python",
) {
  return Object.fromEntries(
    Object.entries(varTypes || {}).filter(
      ([name]) => !isRuntimeNoiseVar(name, "", language),
    ),
  );
}

export function collectUserDeclaredSymbols(code: string, language = "python") {
  const allowed = new Set<string>([
    "i",
    "j",
    "k",
    "r",
    "c",
    "x",
    "y",
    "z",
    "nx",
    "ny",
    "nr",
    "nc",
    "lj",
    "rj",
    "nk",
  ]);
  const lines = code.split("\n");
  const add = (name: string) => {
    const key = name.trim();
    if (!key) return;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return;
    if (key === "_") return;
    allowed.add(key);
  };
  const addMultiTargets = (segment: string) => {
    segment
      .split(",")
      .forEach((part) => add(part.replace(/[\(\)\[\]\{\}\s]/g, "")));
  };

  for (const raw of lines) {
    // 언어별 주석 제거
    const line = (
      language === "javascript" || language === "java"
        ? raw.replace(/\/\/.*/, "")
        : raw.replace(/#.*/, "")
    ).trim();
    if (!line) continue;

    if (language === "javascript") {
      // const/let/var 선언
      const jsDecl = line.match(
        /^(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
      );
      if (jsDecl) add(jsDecl[1]);

      // function 선언 + 파라미터
      const jsFn = line.match(
        /^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)/,
      );
      if (jsFn) {
        add(jsFn[1]);
        // TODO: arg.replace(/[=\s].*/, "") 에서 선행 공백이 매칭되어 두 번째 이후 파라미터가 소실됨
        // .trim() 후 replace하거나 /=.*/ 로 변경 필요
        jsFn[2].split(",").forEach((arg) =>
          add(
            arg
              .replace(/[=\s].*/, "")
              .replace(/^\.\.\./, "")
              .trim(),
          ),
        );
      }

      // for 루프 변수: for (let x = ...) / for (const x of ...)
      const jsFor = line.match(
        /^for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
      );
      if (jsFor) add(jsFor[1]);

      // 일반 대입 (const/let/var 제거 후)
      const assignIdx = line.indexOf("=");
      if (
        assignIdx > 0 &&
        !line.includes("==") &&
        !line.includes(">=") &&
        !line.includes("<=") &&
        !line.includes("!=") &&
        !line.includes("=>")
      ) {
        const left = line
          .slice(0, assignIdx)
          .trim()
          .replace(/^(?:const|let|var)\s+/, "");
        if (left && !/[.([\s]/.test(left)) add(left);
      }
    } else if (language === "java") {
      const javaDecl = line.match(
        /^(?:(?:(?:private|protected|public|static|final)\s+)*[\w<>\[\]]+)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=;(]/,
      );
      if (javaDecl && !JAVA_KEYWORDS.has(javaDecl[1])) add(javaDecl[1]);

      const javaMethod = line.match(
        /^(?:(?:private|protected|public|static|final|void|\w+)\s+)+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)/,
      );
      if (javaMethod && !JAVA_KEYWORDS.has(javaMethod[1])) {
        add(javaMethod[1]);
        javaMethod[2].split(",").forEach((arg) => {
          const parts = arg.trim().split(/\s+/);
          if (parts.length >= 2) add(parts[parts.length - 1]);
        });
      }

      const javaFor = line.match(
        /^for\s*\(\s*\w+\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=:]/,
      );
      if (javaFor) add(javaFor[1]);

      const javaAssign = line.indexOf("=");
      if (
        javaAssign > 0 &&
        !line.includes("==") &&
        !line.includes(">=") &&
        !line.includes("<=") &&
        !line.includes("!=")
      ) {
        const left = line.slice(0, javaAssign).trim();
        const parts = left.split(/\s+/);
        const candidate = parts[parts.length - 1].replace(/[\[\]]/g, "");
        if (
          candidate &&
          !/[.(]/.test(candidate) &&
          !JAVA_KEYWORDS.has(candidate)
        )
          add(candidate);
      }
    } else {
      // Python 기존 로직
      const fn = line.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
      if (fn) {
        add(fn[1]);
        fn[2].split(",").forEach((arg) => add(arg.split("=")[0].trim()));
      }
      const cls = line.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (cls) add(cls[1]);
      const imp = line.match(/^import\s+(.+)$/);
      if (imp) {
        imp[1].split(",").forEach((chunk) => {
          const part = chunk.trim();
          if (!part) return;
          const asIdx = part.indexOf(" as ");
          if (asIdx >= 0) add(part.slice(asIdx + 4).trim());
          else add(part.split(".")[0]);
        });
      }
      const fromImp = line.match(/^from\s+.+\s+import\s+(.+)$/);
      if (fromImp) {
        fromImp[1].split(",").forEach((chunk) => {
          const part = chunk.trim();
          if (!part || part === "*") return;
          const asIdx = part.indexOf(" as ");
          if (asIdx >= 0) add(part.slice(asIdx + 4).trim());
          else add(part);
        });
      }
      const forLoop = line.match(/^for\s+(.+?)\s+in\s+/);
      if (forLoop) addMultiTargets(forLoop[1]);
      const withAs = line.match(/^with\s+.+\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (withAs) add(withAs[1]);
      const assignIdx = line.indexOf("=");
      if (
        assignIdx > 0 &&
        !line.includes("==") &&
        !line.includes(">=") &&
        !line.includes("<=") &&
        !line.includes("!=")
      ) {
        const left = line.slice(0, assignIdx).trim();
        if (left) addMultiTargets(left);
      }
    }
  }
  return allowed;
}

export function sanitizeRawTraceWithAllowlist(
  rawTrace: RawTraceStep[],
  allowed: Set<string>,
  language = "python",
): RawTraceStep[] {
  return rawTrace.map((step) => {
    const vars = Object.fromEntries(
      Object.entries(step.vars || {}).filter(
        ([name, value]) =>
          allowed.has(name) && !isRuntimeNoiseVar(name, value, language),
      ),
    );
    return { ...step, vars };
  });
}

export function sanitizeVarTypesWithAllowlist(
  varTypes: Record<string, string>,
  allowed: Set<string>,
  language = "python",
) {
  return Object.fromEntries(
    Object.entries(varTypes || {}).filter(
      ([name]) => allowed.has(name) && !isRuntimeNoiseVar(name, "", language),
    ),
  );
}
