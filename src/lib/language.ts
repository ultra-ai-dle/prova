export type SupportedLanguage = "python" | "javascript" | "java";

/**
 * 언어 비교 유틸리티.
 *
 * @example
 * lang(language).js    // language === "javascript"
 * lang(language).py    // language === "python"
 * lang(language).java  // language === "java"
 */
export function lang(language: string) {
  return {
    js:   language === "javascript",
    py:   language === "python",
    java: language === "java",
  } as const;
}

export function languageDisplayLabel(language: SupportedLanguage): string {
  switch (language) {
    case "javascript":
      return "JavaScript";
    case "java":
      return "Java";
    default:
      return "Python";
  }
}
