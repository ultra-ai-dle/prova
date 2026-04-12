import type { SupportedLanguage } from "./language";

export const PY_KEYWORDS = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

export const JS_KEYWORDS = new Set([
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

export const PYTHON_LANGUAGE_HINTS = [
  "def",
  "elif",
  "except",
  "nonlocal",
  "lambda",
  "None",
  "True",
  "False",
  "yield",
  "with",
  "import",
  "from",
  "pass",
  "raise",
];

export const JAVASCRIPT_LANGUAGE_HINTS = [
  "function",
  "const",
  "let",
  "var",
  "console",
  "undefined",
  "null",
  "new",
  "class",
  "extends",
  "this",
  "return",
  "async",
  "await",
];

/** Java 언어 예약어·리터럴 — 하이라이트·휴리스틱 감지에 공유 */
export const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "var",
  "void",
  "volatile",
  "while",
  "true",
  "false",
]);

export const JAVA_LANGUAGE_HINTS = [
  "public",
  "static",
  "void",
  "String",
  "System",
  "println",
  "class",
  "interface",
  "implements",
  "extends",
  "new",
  "import",
  "package",
];

/** 휴리스틱 단어 스캔용 — 블록·라인 주석을 제거한다(문자열 내부는 완벽하지 않음). */
export function stripCommentsForLanguageHeuristics(code: string): string {
  const withoutBlock = code.replace(/\/\*[\s\S]*?\*\//g, " ");
  return withoutBlock
    .replace(/(^|[^\n])\/\/.*$/gm, "$1 ")
    .replace(/#.*/g, " ");
}

function wordMembership(w: string): { py: boolean; js: boolean; java: boolean } {
  return {
    py: PY_KEYWORDS.has(w) || PYTHON_LANGUAGE_HINTS.includes(w),
    js: JS_KEYWORDS.has(w) || JAVASCRIPT_LANGUAGE_HINTS.includes(w),
    java: JAVA_KEYWORDS.has(w) || JAVA_LANGUAGE_HINTS.includes(w),
  };
}

export function detectLanguageFromCode(
  code: string,
  fallback: SupportedLanguage = "python",
): SupportedLanguage {
  const compact = code.trim();
  if (!compact) return fallback;

  let pyScore = 0;
  let jsScore = 0;
  let javaScore = 0;

  const lines = compact.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const pyLine = line.replace(/#.*/, "");
    const cStyleLine = line.replace(/\/\/.*/, "");

    if (/^\s*(def|class)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(pyLine))
      pyScore += 4;
    if (
      /:\s*$/.test(pyLine) &&
      /^(if|elif|else|for|while|def|class|try|except|with)\b/.test(pyLine)
    )
      pyScore += 2;
    if (/\bprint\s*\(/.test(pyLine)) pyScore += 1;

    // const/let 은 JS·TS에 강한 신호. Java 10+ 의 var 는 JS 와 겹치므로 약한 점수만 부여한다.
    if (/\b(?:const|let)\s+[A-Za-z_$][A-Za-z0-9_$]*/.test(cStyleLine))
      jsScore += 3;
    if (/\bvar\s+[A-Za-z_$][A-Za-z0-9_$]*/.test(cStyleLine)) jsScore += 1;
    if (/\bfunction\b|\=\>\s*/.test(cStyleLine)) jsScore += 3;
    if (/\bconsole\.log\s*\(/.test(cStyleLine)) jsScore += 2;
    // C 계열 공통 문법 — JS 만 올리면 Java 가 불리해져 양쪽에 동일 반영
    if (/[{};]/.test(cStyleLine)) {
      jsScore += 1;
      javaScore += 1;
    }
    if (/===|!==/.test(cStyleLine)) jsScore += 1;

    if (/^\s*(public|private|protected)?\s*(static\s+)?(class|interface|enum)\s+/.test(cStyleLine))
      javaScore += 4;
    if (/\bpackage\s+/.test(cStyleLine) || /\bimport\s+java\./.test(cStyleLine))
      javaScore += 3;
    if (/\bpublic\s+static\s+void\s+main\s*\(/.test(cStyleLine)) javaScore += 4;
    if (/System\.(out|in)\b/.test(cStyleLine)) javaScore += 2;
  }

  const codeForWords = stripCommentsForLanguageHeuristics(compact);
  const wordPattern = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
  const words = codeForWords.match(wordPattern) ?? [];
  for (const w of words) {
    const m = wordMembership(w);
    const nLang = (m.py ? 1 : 0) + (m.js ? 1 : 0) + (m.java ? 1 : 0);
    // 여러 언어 예약어에 동시에 걸리는 토큰(class, return, import 등)은 구분력이 없어 스코어에서 제외
    if (nLang !== 1) continue;
    if (m.py) pyScore += 1;
    if (m.js) jsScore += 1;
    if (m.java) javaScore += 1;
  }

  if (
    javaScore > pyScore + 1 &&
    javaScore > jsScore + 1
  )
    return "java";
  if (jsScore > pyScore + 1 && jsScore > javaScore + 1) return "javascript";
  if (pyScore > jsScore + 1 && pyScore > javaScore + 1) return "python";
  return fallback;
}
