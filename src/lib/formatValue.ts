// ── 숫자 변환 ─────────────────────────────────────────────────────────────────

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function toNumberWithFallback(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

// ── 타입 가드 ─────────────────────────────────────────────────────────────────

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// ── 스칼라 포맷 ───────────────────────────────────────────────────────────────

export function formatScalar(value: unknown, bitmaskMode = false, bitWidth = 1) {
  if (value == null) return "null";
  if (value === "True" || value === "true") return "T";
  if (value === "False" || value === "false") return "F";
  if (typeof value === "string") return value.length > 26 ? `${value.slice(0, 26)}…` : value;
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return value.toString(2).padStart(Math.max(1, bitWidth), "0");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  return String(value);
}

export function formatCellValue(value: unknown, bitmaskMode = false, bitWidth = 1) {
  if (value == null) return "";
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return `${value.toString(2).padStart(Math.max(1, bitWidth), "0")}`;
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  if (typeof value === "string") return value.length > 8 ? `${value.slice(0, 8)}…` : value;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

export function formatCompact(value: unknown, bitmaskMode = false, bitWidth = 1) {
  if (Array.isArray(value)) return `[${value.length}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).length}}`;
  return formatScalar(value, bitmaskMode, bitWidth);
}

// ── JSON 직렬화 ───────────────────────────────────────────────────────────────

export function toJsonLike(value: unknown, depth = 0, bitmaskMode = false, bitWidth = 1): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);
  if (value == null) return "null";
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return value.toString(2).padStart(Math.max(1, bitWidth), "0");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.slice(0, 16).map((v) => `${nextIndent}${toJsonLike(v, depth + 1, bitmaskMode, bitWidth)}`);
    const tail = value.length > 16 ? `${nextIndent}"...(+${value.length - 16})"` : "";
    return `[\n${[...items, ...(tail ? [tail] : [])].join(",\n")}\n${indent}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const rows = entries.slice(0, 24).map(
      ([k, v]) => `${nextIndent}${JSON.stringify(k)}: ${toJsonLike(v, depth + 1, bitmaskMode, bitWidth)}`
    );
    if (entries.length > 24) rows.push(`${nextIndent}"...": "+${entries.length - 24} keys"`);
    return `{\n${rows.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(String(value));
}

export function toJsonCompact(value: unknown, bitmaskMode = false, bitWidth = 1): string {
  if (value == null) return "null";
  if (typeof value === "number") {
    if (bitmaskMode && Number.isInteger(value) && value >= 0) {
      return value.toString(2).padStart(Math.max(1, bitWidth), "0");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "T" : "F";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => toJsonCompact(v, bitmaskMode, bitWidth)).join(", ")}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${toJsonCompact(v, bitmaskMode, bitWidth)}`).join(", ")} }`;
  }
  return JSON.stringify(String(value));
}

export function toJsonPreferSingleLine(value: unknown, maxLen = 120, bitmaskMode = false, bitWidth = 1): string {
  const oneLine = toJsonCompact(value, bitmaskMode, bitWidth);
  if (oneLine.length <= maxLen) return oneLine;
  return toJsonLike(value, 0, bitmaskMode, bitWidth);
}

// ── page.tsx 유틸 ─────────────────────────────────────────────────────────────

export function maxNumericAbs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value))
    return Math.abs(value);
  if (Array.isArray(value))
    return value.reduce((m, v) => Math.max(m, maxNumericAbs(v)), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (m, v) => Math.max(m, maxNumericAbs(v)),
      0,
    );
  }
  return 0;
}

export function formatWithBitMode(
  value: unknown,
  bitmaskMode: boolean,
  bitWidth: number,
): string {
  if (
    !(
      bitmaskMode &&
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0
    )
  ) {
    return JSON.stringify(value);
  }
  const bin = value.toString(2).padStart(Math.max(1, bitWidth), "0");
  return `${value} (${bin})`;
}
