import type { AnalyzeMetadata } from '@/types/frogger';

/**
 * AI가 graph_mode를 빼먹을 때 단방향/무방향을 추론한다.
 * (위상정렬·in-degree·방향성 최단경로 등 → directed)
 */
export function inferGraphModeFromCode(
  code: string,
): 'directed' | 'undirected' | undefined {
  const c = code.toLowerCase();
  const directedHints = [
    /\bin_degrees?\b/,
    /\bindegree\b/,
    /\bout_degrees?\b/,
    /\btopolog/i,
    /\bdag\b/,
    /위상/,
    /kahn/,
    /directed/,
    /단방향/,
    /방향\s*그래프/,
  ];
  const undirectedHints = [
    /\bundirected\b/,
    /무방향/,
    /\bdsu\b/,
    /disjoint|union.?find/,
    /\bkruskal\b/i,
    /\bmst\b/,
  ];
  const d = directedHints.some((re) => re.test(c));
  const u = undirectedHints.some((re) => re.test(c));
  if (d && !u) return 'directed';
  if (u && !d) return 'undirected';
  return undefined;
}

export function resolveGraphMode(
  metadata: AnalyzeMetadata | null | undefined,
  code: string,
): 'directed' | 'undirected' {
  const inferred = inferGraphModeFromCode(code);
  const explicit = metadata?.graph_mode;
  // 코드에 in_degree·위상·heapq 등 단방향 신호가 있으면 AI의 잘못된 undirected를 덮어쓴다.
  if (inferred === 'directed') return 'directed';
  if (explicit === 'directed' || explicit === 'undirected') return explicit;
  return inferred ?? 'undirected';
}
