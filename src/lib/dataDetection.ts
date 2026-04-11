import { toFiniteNumber, isPlainObject } from "@/lib/formatValue";

// ── 기본 배열 판별 ───────────────────────────────────────────────────────────

export function is2DArray(value: unknown): value is unknown[][] {
  return Array.isArray(value) && Array.isArray(value[0]);
}

export function is1DArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && !Array.isArray(value[0]);
}

export function to2D(value: unknown): unknown[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (Array.isArray(row) ? row : [row]));
}

// ── 그리드 수치 헬퍼 ─────────────────────────────────────────────────────────

export function getPositiveMaxInGrid(grid: unknown[][]): number {
  let maxVal = 1;
  grid.forEach((row) => {
    row.forEach((cell) => {
      const n = toFiniteNumber(cell);
      if (n !== null && n > 0) maxVal = Math.max(maxVal, n);
    });
  });
  return maxVal;
}

export function getGridCellTone(value: unknown, positiveMax: number) {
  const isFalsy = value == null || value === "" || value === false || value === 0;
  const n = toFiniteNumber(value);
  if (n !== null && n < 0) {
    return "border-[#7f3b3b] bg-[#3a1919] text-[#ffb4b4]";
  }
  if (isFalsy || n === 0 || n === null) {
    return "border-[#2a2f36] bg-[#161b22] text-[#8b949e]";
  }
  const ratio = Math.max(0, Math.min(1, n / Math.max(positiveMax, 1)));
  const stage = Math.max(1, Math.min(10, Math.ceil(ratio * 10)));
  const blueStage: Record<number, string> = {
    1: "border-[#2e4f77] bg-[#10243a] text-[#8fbde6]",
    2: "border-[#31557f] bg-[#112843] text-[#93c1e9]",
    3: "border-[#355b88] bg-[#122d4a] text-[#98c6ec]",
    4: "border-[#386191] bg-[#143252] text-[#9ecbf0]",
    5: "border-[#3c6799] bg-[#15365a] text-[#a4d0f3]",
    6: "border-[#406ea2] bg-[#173b62] text-[#aad5f6]",
    7: "border-[#4474ab] bg-[#18406a] text-[#afdafa]",
    8: "border-[#487ab3] bg-[#1a4472] text-[#b6defd]",
    9: "border-[#4b81bc] bg-[#1b497a] text-[#c0e4ff]",
    10: "border-[#5087c4] bg-[#1d4e83] text-[#cce9ff]",
  };
  return blueStage[stage];
}

// ── 2D 격자 감지 ─────────────────────────────────────────────────────────────

/**
 * 숫자/스칼라로 채운 2차원 표(DP, 비용행렬, visited 등). 인접 리스트와 구분해 그리드로 본다.
 * 인접 리스트는 일부 정점이 []라 minLen===0이 되므로, 그 경우는 그리드로 보지 않는다.
 */
export function looksLike2DScalarTableGrid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row))) return false;
  const rows = value as unknown[][];
  const lens = rows.map((r) => r.length);
  const minLen = Math.min(...lens);
  const maxLen = Math.max(...lens);
  if (maxLen === 0) return false;
  if (minLen === 0) return false;
  if (maxLen - minLen > 4) return false;
  const flat = rows.flat();
  const scalars = flat.filter((v) => v == null || ["number", "string", "boolean"].includes(typeof v)).length;
  return scalars / flat.length >= 0.82;
}

/**
 * 미로·맵·보드 등 2차원 격자(타일 문자/숫자). looksLike2DScalarTableGrid보다 완화해
 * 행 길이가 약간 들쭉날쭉해도 GRAPHLIKE(인접리스트 오인)로 가지 않게 한다.
 */
export function is2DRectangularCellGrid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row))) return false;
  const rows = value as unknown[][];
  const lens = rows.map((r) => r.length);
  const minLen = Math.min(...lens);
  const maxLen = Math.max(...lens);
  if (minLen === 0) return false;
  if (maxLen - minLen > 8) return false;
  const flat = rows.flat();
  if (flat.length === 0) return false;
  const scalars = flat.filter((v) => v == null || ["number", "string", "boolean"].includes(typeof v)).length;
  return scalars / flat.length >= 0.68;
}

// ── 그래프 / 그리드 판별 ─────────────────────────────────────────────────────

export function detectGraphLike(value: unknown) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    if (!value.every((row) => Array.isArray(row))) return false;
    if (looksLike2DScalarTableGrid(value)) return false;
    if (is2DRectangularCellGrid(value)) return false;
    return true;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.edges)) return true;
    // adjacency map
    return Object.values(obj).some((v) => Array.isArray(v));
  }
  return false;
}

export function isClearlyGridLike(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row))) return false;
  const rows = value as unknown[][];
  const rowLens = rows.map((r) => r.length);
  const minLen = Math.min(...rowLens);
  const maxLen = Math.max(...rowLens);
  // 빈 행이 섞인 2중 리스트(인접 리스트 등)는 그리드가 아님.
  if (maxLen === 0) return false;
  if (minLen === 0) return false;
  const rectangular = maxLen - minLen <= 2;
  const scalarRatio = rows.flat().filter((v) => v == null || ["number", "string", "boolean"].includes(typeof v)).length
    / Math.max(1, rows.flat().length);
  return rectangular && scalarRatio > 0.88;
}

export function canGraphLikeUseGridView(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  return value.every((row) => Array.isArray(row));
}

// ── 방향 벡터 감지 ───────────────────────────────────────────────────────────

export function isDirectionVectorTuple(value: unknown): boolean {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === "number"
    && typeof value[1] === "number";
}

export function isDirectionVectorListLike(value: unknown): value is unknown[][] {
  return Array.isArray(value)
    && value.length > 0
    && value.length <= 16
    && (value as unknown[]).every((row) => isDirectionVectorTuple(row));
}

export function isDirectionMapLike(name: string, value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (!/dir|dirs|direction|delta|move|step/i.test(name)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > 12) return false;
  return entries.every(([k, v]) => /^[A-Za-z]+$/.test(k) && isDirectionVectorTuple(v));
}

// ── 3D / 비트마스크 감지 ─────────────────────────────────────────────────────

export function is3DBooleanStateGrid(value: unknown): value is unknown[][][] {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((row) => Array.isArray(row) && row.length > 0)) return false;
  const rows = value as unknown[][];
  if (!rows.every((row) => row.every((cell) => Array.isArray(cell)))) return false;
  const sample = (rows[0]?.[0] as unknown[]) ?? [];
  if (sample.length === 0) return false;
  const isBoolish = (v: unknown) =>
    typeof v === "boolean"
    || (typeof v === "number" && Number.isFinite(v))
    || (typeof v === "string" && /^(true|false|t|f|0|1)$/i.test(v.trim()));
  return rows.every((row) => row.every((cell) => (cell as unknown[]).every(isBoolish)));
}

export function is2DBitmaskGrid(value: unknown): value is number[][] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(
      (row) => Array.isArray(row)
        && row.length > 0
        && (row as unknown[]).every(
          (cell) => typeof cell === "number" && Number.isInteger(cell) && cell >= 0
        )
    );
}

export function inferBitWidthFromGrid(grid: number[][], fallback = 1, cap = 64) {
  let maxValue = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell > maxValue) maxValue = cell;
    }
  }
  const inferred = maxValue > 0 ? Math.floor(Math.log2(maxValue)) + 1 : 1;
  return Math.max(1, Math.min(cap, Math.max(fallback, inferred)));
}

export function expand2DBitmaskGridTo3D(grid: number[][], bits: number): unknown[][][] {
  return grid.map((row) =>
    row.map((mask) =>
      Array.from({ length: bits }, (_, z) => Boolean(mask & (1 << z)))
    )
  );
}
