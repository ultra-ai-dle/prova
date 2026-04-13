/**
 * 소스 코드에서 주석을 제거한다.
 *
 * 지원 언어:
 *   - python  : # 한 줄 주석, """...""" / '''...''' docstring
 *   - java    : // 한 줄, /* ... *\/ 블록
 *   - javascript : // 한 줄, /* ... *\/ 블록, 템플릿 리터럴(``) 내부 보존
 *
 * 원칙: 문자열 리터럴 안의 주석 기호는 절대 건드리지 않는다.
 * 주석을 공백 한 칸으로 치환 (줄 구조 보존을 위해 줄바꿈은 남긴다).
 */

type Language = "python" | "java" | "javascript";

export function stripComments(code: string, language: Language): string {
  if (language === "python") return stripPython(code);
  return stripCStyle(code, language);
}

// ── Python ────────────────────────────────────────────────────────────────────

function stripPython(code: string): string {
  const out: string[] = [];
  let i = 0;
  const n = code.length;

  while (i < n) {
    // triple-quoted string (docstring 포함) — 내용 그대로 통과
    if (
      (code[i] === '"' || code[i] === "'") &&
      code[i + 1] === code[i] &&
      code[i + 2] === code[i]
    ) {
      const q = code.slice(i, i + 3);
      out.push(q);
      i += 3;
      while (i < n) {
        if (code.slice(i, i + 3) === q) {
          out.push(q);
          i += 3;
          break;
        }
        out.push(code[i++]);
      }
      continue;
    }

    // single-quoted string — 내용 그대로 통과
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i];
      out.push(code[i++]);
      while (i < n && code[i] !== q) {
        if (code[i] === "\\") out.push(code[i++]);  // 이스케이프
        out.push(code[i++]);
      }
      if (i < n) out.push(code[i++]);  // 닫는 따옴표
      continue;
    }

    // # 주석 — 줄 끝까지 drop (줄바꿈은 보존)
    if (code[i] === "#") {
      while (i < n && code[i] !== "\n") i++;
      continue;
    }

    out.push(code[i++]);
  }

  return out.join("");
}

// ── Java / JavaScript ─────────────────────────────────────────────────────────

function stripCStyle(code: string, language: Language): string {
  const out: string[] = [];
  let i = 0;
  const n = code.length;

  while (i < n) {
    // 템플릿 리터럴 (JS only) — 내용 그대로 통과
    if (language === "javascript" && code[i] === "`") {
      out.push(code[i++]);
      while (i < n && code[i] !== "`") {
        if (code[i] === "\\") out.push(code[i++]);
        out.push(code[i++]);
      }
      if (i < n) out.push(code[i++]);
      continue;
    }

    // double-quoted string
    if (code[i] === '"') {
      out.push(code[i++]);
      while (i < n && code[i] !== '"') {
        if (code[i] === "\\") out.push(code[i++]);
        out.push(code[i++]);
      }
      if (i < n) out.push(code[i++]);
      continue;
    }

    // single-quoted char/string
    if (code[i] === "'") {
      out.push(code[i++]);
      while (i < n && code[i] !== "'") {
        if (code[i] === "\\") out.push(code[i++]);
        out.push(code[i++]);
      }
      if (i < n) out.push(code[i++]);
      continue;
    }

    // // 한 줄 주석 — 줄 끝까지 drop
    if (code[i] === "/" && code[i + 1] === "/") {
      while (i < n && code[i] !== "\n") i++;
      continue;
    }

    // /* ... */ 블록 주석 — 줄바꿈은 보존
    if (code[i] === "/" && code[i + 1] === "*") {
      i += 2;
      while (i < n) {
        if (code[i] === "\n") out.push("\n");  // 줄 구조 유지
        if (code[i] === "*" && code[i + 1] === "/") { i += 2; break; }
        i++;
      }
      continue;
    }

    out.push(code[i++]);
  }

  return out.join("");
}
