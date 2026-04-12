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

    if (/\b(?:const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*/.test(cStyleLine))
      jsScore += 3;
    if (/\bfunction\b|\=\>\s*/.test(cStyleLine)) jsScore += 3;
    if (/\bconsole\.log\s*\(/.test(cStyleLine)) jsScore += 2;
    if (/[{};]|===|!==/.test(cStyleLine)) jsScore += 1;

    if (/^\s*(public|private|protected)?\s*(static\s+)?(class|interface|enum)\s+/.test(cStyleLine))
      javaScore += 4;
    if (/\bpackage\s+/.test(cStyleLine) || /\bimport\s+java\./.test(cStyleLine))
      javaScore += 3;
    if (/\bpublic\s+static\s+void\s+main\s*\(/.test(cStyleLine)) javaScore += 4;
    if (/System\.(out|in)\b/.test(cStyleLine)) javaScore += 2;
  }

  // TODO: 주석 내 키워드도 스코어에 반영되는 버그 — compact 대신 주석 제거된 텍스트를 사용해야 함
  const wordPattern = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
  const words = compact.match(wordPattern) ?? [];
  for (const w of words) {
    if (PY_KEYWORDS.has(w) || PYTHON_LANGUAGE_HINTS.includes(w)) pyScore += 1;
    if (JS_KEYWORDS.has(w) || JAVASCRIPT_LANGUAGE_HINTS.includes(w))
      jsScore += 1;
    if (JAVA_KEYWORDS.has(w) || JAVA_LANGUAGE_HINTS.includes(w)) javaScore += 1;
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
