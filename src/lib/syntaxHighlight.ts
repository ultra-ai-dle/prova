import { PY_KEYWORDS, JS_KEYWORDS } from "./languageDetection";

export type HighlightToken = { text: string; className: string };

type LanguageConfig = {
  pattern: RegExp;
  commentPrefix: string;
  keywords: Set<string>;
  isString: (token: string) => boolean;
};

const JS_CONFIG: LanguageConfig = {
  // TODO: \b가 $ 앞에서 word boundary로 동작하지 않아 $el 같은 식별자가 올바르게 매칭되지 않음
  pattern:
    /(\/\/.*$|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_$][A-Za-z0-9_$]*\b|\b\d+(?:\.\d+)?\b)/g,
  commentPrefix: "//",
  keywords: JS_KEYWORDS,
  isString: (t) => /^["`']/.test(t),
};

const PY_CONFIG: LanguageConfig = {
  pattern:
    /(#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?\b)/g,
  commentPrefix: "#",
  keywords: PY_KEYWORDS,
  isString: (t) => t.startsWith('"') || t.startsWith("'"),
};

function tokenizeLine(line: string, config: LanguageConfig): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  const pattern = new RegExp(config.pattern.source, config.pattern.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(line);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, match.index),
        className: "text-[#c9d1d9]",
      });
    }
    const token = match[0];

    if (token.startsWith(config.commentPrefix)) {
      tokens.push({ text: token, className: "text-[#8b949e] italic" });
    } else if (config.isString(token)) {
      tokens.push({ text: token, className: "text-[#a5d6ff]" });
    } else if (/^\d/.test(token)) {
      tokens.push({ text: token, className: "text-[#79c0ff]" });
    } else if (config.keywords.has(token)) {
      tokens.push({ text: token, className: "text-[#ff7b72]" });
    } else {
      tokens.push({ text: token, className: "text-[#d2a8ff]" });
    }

    lastIndex = match.index + token.length;
    match = pattern.exec(line);
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), className: "text-[#c9d1d9]" });
  }
  if (tokens.length === 0) {
    tokens.push({ text: " ", className: "text-[#c9d1d9]" });
  }
  return tokens;
}

export function highlightJsLine(line: string): HighlightToken[] {
  return tokenizeLine(line, JS_CONFIG);
}

export function highlightPythonLine(line: string): HighlightToken[] {
  return tokenizeLine(line, PY_CONFIG);
}
