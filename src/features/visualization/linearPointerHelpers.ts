/**
 * 선형 배열 셀 포인터: `/api/analyze`가 반환한 `linear_pivots`만 사용한다.
 * 변수명 패턴으로 역할을 추측하지 않는다.
 */

import type { LinearPivotSpec } from "@/types/prova";

export type LinearPointerAt = {
  varName: string;
  badge: string;
  ringClass: string;
};

export type LinearPointerMap = Map<number, LinearPointerAt[]>;

/** `linear_pivots` 배열 순서에 따른 링 색 (이름과 무관) */
const RING_CLASS_BY_SPEC_ORDER = [
  "ring-2 ring-amber-400/85 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]",
  "ring-2 ring-violet-400/85 shadow-[0_0_0_1px_rgba(167,139,250,0.35)]",
  "ring-2 ring-sky-400/80",
  "ring-2 ring-emerald-400/80",
  "ring-2 ring-cyan-400/75",
  "ring-2 ring-fuchsia-400/75",
  "ring-2 ring-rose-400/75",
  "ring-2 ring-orange-400/80",
  "ring-2 ring-teal-400/70",
  "ring-2 ring-pink-400/75",
  "ring-2 ring-lime-400/70",
  "ring-2 ring-indigo-400/75"
];

function defaultBadgeForVar(varName: string): string {
  const t = varName.trim();
  if (t.length <= 2) return t || "?";
  return t.slice(0, 2);
}

function cellMatchesMarkerValue(cell: unknown, needle: unknown): boolean {
  if (needle === null || needle === undefined) return false;
  if (typeof needle === "number" && Number.isFinite(needle)) {
    return typeof cell === "number" && Number.isFinite(cell) && Object.is(cell, needle);
  }
  if (typeof needle === "string") return cell === needle;
  if (typeof needle === "boolean") return cell === needle;
  return false;
}

/** 배열에서 needle과 같은 값의 첫 인덱스 (1D 시각화 슬롯 길이 제한) */
function findFirstValueIndexInArray(arr: unknown[], needle: unknown, slotCount: number): number {
  const n = Math.min(arr.length, slotCount);
  for (let i = 0; i < n; i++) {
    if (cellMatchesMarkerValue(arr[i], needle)) return i;
  }
  return -1;
}

/**
 * @param linearPivots AI 메타의 선형 하이라이트 목록
 * @param arrKey 현재 그리는 1차원 배열의 변수명
 * @param allOneDKeys 트레이스에 존재하는 1D 배열 변수명 목록 (indexes_1d_var 생략 시 단일 배열일 때만 매칭)
 */
export function pointersAtIndexFromSpecs(
  linearPivots: LinearPivotSpec[] | undefined,
  vars: Record<string, unknown>,
  arrKey: string,
  arrLength: number,
  allOneDKeys: string[]
): LinearPointerMap {
  const m = new Map<number, LinearPointerAt[]>();
  if (!linearPivots?.length) return m;

  const single1D = allOneDKeys.length === 1;

  linearPivots.forEach((spec, orderIdx) => {
    const applies =
      (typeof spec.indexes_1d_var === "string" && spec.indexes_1d_var === arrKey)
      || (!spec.indexes_1d_var && single1D && allOneDKeys[0] === arrKey);
    if (!applies) return;

    const mode = spec.pivot_mode ?? "index";
    let idx: number;

    if (mode === "value_in_array") {
      const needle = vars[spec.var_name];
      const arrRaw = vars[arrKey];
      if (!Array.isArray(arrRaw)) return;
      idx = findFirstValueIndexInArray(arrRaw as unknown[], needle, arrLength);
    } else {
      const raw = vars[spec.var_name];
      if (typeof raw !== "number" || !Number.isFinite(raw)) return;
      idx = Math.trunc(raw);
    }

    if (idx < 0 || idx >= arrLength) return;

    const ringClass = RING_CLASS_BY_SPEC_ORDER[orderIdx % RING_CLASS_BY_SPEC_ORDER.length];
    const badge =
      spec.badge && spec.badge.length > 0 ? spec.badge : defaultBadgeForVar(spec.var_name);
    const entry: LinearPointerAt = { varName: spec.var_name, badge, ringClass };
    if (!m.has(idx)) m.set(idx, []);
    m.get(idx)!.push(entry);
  });

  return m;
}

/** `linear_context_var_names`(AI)만 사용; 없으면 요약 줄 없음 */
export function formatLinearAlgoContext(
  vars: Record<string, unknown>,
  linearContextVarNames?: string[]
): string | null {
  if (!linearContextVarNames?.length) return null;
  const parts: string[] = [];
  for (const k of linearContextVarNames) {
    const v = vars[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      parts.push(`${k}=${v}`);
    } else if (typeof v === "boolean") {
      parts.push(`${k}=${v ? "T" : "F"}`);
    } else if (typeof v === "string" && v.length <= 48) {
      parts.push(`${k}=${v}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
