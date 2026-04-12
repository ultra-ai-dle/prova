import { AnalyzeMetadata, LinearPivotSpec } from "@/types/prova";
import { inferGraphModeFromCode } from "@/lib/graphModeInference";
import { applyPythonEnricher }   from "./enrichers/python";
import { applyJsEnricher }       from "./enrichers/javascript";
import { applyJavaEnricher }     from "./enrichers/java";

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function detectDirectionMapVars(code: string) {
  const vars = new Set<string>();
  const lines = code.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/#.*/, "");
    const mapLike = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{.*\}/);
    if (!mapLike) continue;
    const name = mapLike[1];
    if (!/dir|dirs|direction|delta|move|step/i.test(name)) continue;
    if (/\([ ]*-?\d+[ ]*,[ ]*-?\d+[ ]*\)/.test(line)) {
      vars.add(name);
    }
  }
  return Array.from(vars);
}

/**
 * 언어별 enricher 디스패처.
 * 역할 결정은 언어별 enricher에서 연산 패턴(usage)으로만 수행한다.
 */
export function applyLanguageEnricher(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
  language: string,
): AnalyzeMetadata {
  if (language === "python")     return applyPythonEnricher(meta, code, varTypes);
  if (language === "javascript") return applyJsEnricher(meta, code, varTypes);
  if (language === "java")       return applyJavaEnricher(meta, code, varTypes);
  return meta;
}

export function applyDirectionMapGuards(
  meta: AnalyzeMetadata,
  code: string,
): AnalyzeMetadata {
  const directionVars = detectDirectionMapVars(code);
  if (directionVars.length === 0) return meta;

  const blocked = new Set(directionVars);
  const nextMapping = Object.fromEntries(
    Object.entries(meta.var_mapping ?? {}).filter(
      ([, item]) => !blocked.has(item.var_name),
    ),
  );
  const nextKeyVars = (meta.key_vars ?? []).filter((v) => !blocked.has(v));

  return {
    ...meta,
    var_mapping: nextMapping,
    key_vars: nextKeyVars,
  };
}

export function applyGraphModeInference(
  meta: AnalyzeMetadata,
  code: string,
): AnalyzeMetadata {
  if (meta.graph_mode === "directed" || meta.graph_mode === "undirected")
    return meta;
  const inferred = inferGraphModeFromCode(code);
  if (!inferred) return meta;
  return { ...meta, graph_mode: inferred };
}

/**
 * 코드 패턴으로 linear_pivots를 보완한다.
 * AI가 이미 linear_pivots를 반환했으면 건드리지 않는다.
 * 투포인터·슬라이딩윈도우 패턴: arrVar[intVar] 형태로 쓰이는 정수 변수 2개 이상 → index 피벗.
 */
export function enrichLinearPivots(
  meta: AnalyzeMetadata,
  code: string,
  varTypes: Record<string, string>,
): AnalyzeMetadata {
  if (meta.linear_pivots && meta.linear_pivots.length > 0) return meta;

  const intVars = Object.entries(varTypes)
    .filter(([, t]) => t === "int")
    .map(([k]) => k);
  const listVars = Object.entries(varTypes)
    .filter(([, t]) => t === "list")
    .map(([k]) => k);

  if (intVars.length < 2 || listVars.length === 0) return meta;

  for (const arrVar of listVars) {
    const indexedVars: string[] = [];
    for (const intVar of intVars) {
      const usedAsIndex = new RegExp(
        `\\b${arrVar}\\s*\\[\\s*${intVar}\\s*\\]`,
      ).test(code);
      if (!usedAsIndex) continue;
      const changes = new RegExp(`\\b${intVar}\\s*[+\\-]?=`).test(code);
      if (changes) indexedVars.push(intVar);
    }
    if (indexedVars.length >= 2) {
      const pivots: LinearPivotSpec[] = indexedVars.map((v) => ({
        var_name: v,
        pivot_mode: "index" as const,
        indexes_1d_var: listVars.length > 1 ? arrVar : undefined,
        badge: v.slice(0, 2),
      }));
      return { ...meta, linear_pivots: pivots };
    }
  }
  return meta;
}
