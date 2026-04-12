/**
 * 텍스트 offset(문자 위치)을 줄 번호(1-based)로 변환한다.
 */
export function lineFromOffset(text: string, offset: number) {
  return text.slice(0, Math.max(0, offset)).split("\n").length;
}

/**
 * 객체를 키 정렬 후 JSON 문자열로 직렬화한다.
 * 키 순서에 무관하게 동일 객체면 동일 문자열을 보장한다.
 */
export function stableStringifyObject(obj: Record<string, string>) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

/**
 * 텍스트의 들여쓰기 크기를 감지한다.
 * 모든 들여쓰기 줄의 공백 수 GCD를 구해 2 또는 4를 반환한다.
 * 들여쓰기가 없으면 null을 반환한다.
 */
// TODO: /^( +)/가 공백만 매칭하여 탭 들여쓰기를 감지하지 못함
export function detectIndentSize(text: string): 2 | 4 | null {
  let gcd = 0;
  for (const line of text.split("\n")) {
    const m = line.match(/^( +)/);
    if (!m) continue;
    const n = m[1].length;
    let a = gcd,
      b = n;
    while (b) {
      [a, b] = [b, a % b];
    }
    gcd = a;
  }
  if (gcd === 0) return null;
  return gcd <= 2 ? 2 : 4;
}

/**
 * 코드의 들여쓰기를 fromSize에서 toSize로 변환한다.
 * 탭과 공백 혼합도 처리한다.
 */
export function convertIndent(code: string, fromSize: number, toSize: number): string {
  return code
    .split("\n")
    .map((line) => {
      const indentMatch = line.match(/^[\t ]+/);
      if (!indentMatch) return line;

      const indent = indentMatch[0];
      const body = line.slice(indent.length);
      let columns = 0;
      for (const ch of indent) {
        columns += ch === "\t" ? fromSize : 1;
      }
      const level = Math.round(columns / fromSize);
      const nextIndent = " ".repeat(level * toSize);
      return `${nextIndent}${body}`;
    })
    .join("\n");
}
