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

export function detectLanguageFromCode(
  code: string,
  fallback: "python" | "javascript" = "python",
): "python" | "javascript" {
  const compact = code.trim();
  if (!compact) return fallback;

  let pyScore = 0;
  let jsScore = 0;

  const lines = compact.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const pyLine = line.replace(/#.*/, "");
    const jsLine = line.replace(/\/\/.*/, "");

    if (/^\s*(def|class)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(pyLine))
      pyScore += 4;
    if (
      /:\s*$/.test(pyLine) &&
      /^(if|elif|else|for|while|def|class|try|except|with)\b/.test(pyLine)
    )
      pyScore += 2;
    if (/\bprint\s*\(/.test(pyLine)) pyScore += 1;

    if (/\b(?:const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*/.test(jsLine))
      jsScore += 3;
    if (/\bfunction\b|\=\>\s*/.test(jsLine)) jsScore += 3;
    if (/\bconsole\.log\s*\(/.test(jsLine)) jsScore += 2;
    if (/[{};]|===|!==/.test(jsLine)) jsScore += 1;

  }

  // TODO: 주석 내 키워드도 스코어에 반영되는 버그 — compact 대신 주석 제거된 텍스트를 사용해야 함
  const wordPattern = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
  const words = compact.match(wordPattern) ?? [];
  for (const w of words) {
    if (PY_KEYWORDS.has(w) || PYTHON_LANGUAGE_HINTS.includes(w)) pyScore += 1;
    if (JS_KEYWORDS.has(w) || JAVASCRIPT_LANGUAGE_HINTS.includes(w))
      jsScore += 1;
  }

  if (jsScore > pyScore + 1) return "javascript";
  if (pyScore > jsScore + 1) return "python";
  return fallback;
}
