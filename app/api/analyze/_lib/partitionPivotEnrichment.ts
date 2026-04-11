import type { AnalyzeMetadata, LinearPivotSpec } from "@/types/prova";

const ASSIGN_HEAD_ELEMENT = /^\s*([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*\[\s*0\s*\]/gm;

function specKey(p: LinearPivotSpec): string {
  return `${p.var_name}|${p.indexes_1d_var ?? ""}|${p.pivot_mode ?? "index"}`;
}

/**
 * 퀵소트·분할 루틴이 있을 법한 코드인지 느슨하게 판별.
 * 변수명이 아니라 def 이름·주석·일반 키워드 문자열 수준만 사용한다.
 */
function codeMayReferenceQuicksortPartition(code: string): boolean {
  const lower = code.toLowerCase();
  if (lower.includes("quicksort")) return true;
  if (lower.includes("quick sort")) return true;
  if (code.includes("퀵소트") || code.includes("퀵 소트")) return true;
  if (/def\s+quickSort\b/.test(code)) return true;
  if (/def\s+quick_sort\b/.test(code)) return true;
  if (/def\s+quick\s*sort\b/i.test(code)) return true;
  return false;
}

/**
 * AI가 linear_pivots(value_in_array)를 빠뜨릴 때 보강: `val = arr[0]` 대입을 찾아 메타에 합친다.
 * 트리거는 위 퀵소트 판별과 별도로, AI 메타의 알고리즘/태그에 quicksort 성격이 있어도 허용한다.
 */
export function enrichAnalyzeMetadataWithPartitionValuePivots(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>
): AnalyzeMetadata {
  const varNames = Object.keys(varTypes);
  const fromAi =
    /\bquick\s*sort\b/i.test(meta.algorithm ?? "")
    || (meta.detected_algorithms ?? []).some((a) => /\bquick/i.test(a))
    || (meta.tags ?? []).some((t) => /quick|quicksort|퀵/i.test(t));

  if (!fromAi && !codeMayReferenceQuicksortPartition(code)) {
    return meta;
  }

  const toAdd: LinearPivotSpec[] = [];
  const seen = new Set<string>();
  ASSIGN_HEAD_ELEMENT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ASSIGN_HEAD_ELEMENT.exec(code)) !== null) {
    const valVar = m[1];
    const arrVar = m[2];
    if (!varNames.includes(valVar) || !varNames.includes(arrVar)) continue;
    const sig = `${valVar}\0${arrVar}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    toAdd.push({
      var_name: valVar,
      pivot_mode: "value_in_array",
      indexes_1d_var: arrVar
    });
  }
  if (toAdd.length === 0) return meta;

  const existing = meta.linear_pivots ?? [];
  const keys = new Set(existing.map(specKey));
  const merged = [...existing];
  for (const p of toAdd) {
    const k = specKey(p);
    if (!keys.has(k)) {
      merged.push(p);
      keys.add(k);
    }
  }
  return { ...meta, linear_pivots: merged };
}
