export function stripCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function extractFirstJsonObject(text: string) {
  const cleaned = stripCodeFence(text);
  const start = cleaned.indexOf("{");
  if (start < 0) return cleaned;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return cleaned.slice(start, i + 1);
      }
    }
  }
  return cleaned;
}

export function sanitizeJsonCandidate(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

export function tryParseJson<T>(text: string): T | null {
  const candidate = extractFirstJsonObject(text);
  const attempts: string[] = [];

  attempts.push(candidate);
  attempts.push(sanitizeJsonCandidate(candidate));

  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first >= 0 && last > first) {
    attempts.push(candidate.slice(first, last + 1));
    attempts.push(sanitizeJsonCandidate(candidate.slice(first, last + 1)));
  }

  for (const raw of attempts) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      // try next repaired candidate
    }
  }
  return null;
}
