export type GraphStepState = {
  visitedNodes: Set<string>;
  frontierNodes: Set<string>;
  currentNode: string | null;
  activeEdge: { source: string; target: string } | null;
  /** 위상정렬 등 출력 순서 (노드 id) */
  resultOrder: string[];
  orderedNodes: Set<string>;
};
