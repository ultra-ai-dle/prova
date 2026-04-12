import type { MergedTraceStep } from "@/types/prova";

export interface CallNode {
  id: string;
  func: string;
  depth: number;
  /** 진입 시점 vars (파라미터 포함) */
  args: Record<string, unknown>;
  returnValue?: unknown;
  hasReturn: boolean;
  startStep: number;
  /** 완료된 호출의 마지막 step */
  endStep?: number;
  children: CallNode[];
  parentId?: string;
}

export interface CallTree {
  roots: CallNode[];
  nodeMap: Map<string, CallNode>;
}

const SKIP_FUNCS = new Set(["<module>", "<global>", "<lambda>", "<listcomp>", "<genexpr>", "<dictcomp>"]);

// ── Tree builder ───────────────────────────────────────────────────────────────

export function buildCallTree(steps: MergedTraceStep[]): CallTree {
  const roots: CallNode[] = [];
  const nodeMap = new Map<string, CallNode>();
  // stack: shallow → deep (last = current deepest frame)
  const stack: CallNode[] = [];
  let counter = 0;

  // Pre-scan: collect return values queued per (func:depth)
  // Multiple same-(func,depth) calls → FIFO queue
  const returnQueues = new Map<string, unknown[]>();
  for (const s of steps) {
    if (s.event === "return") {
      const key = `${s.scope.func}:${s.scope.depth}`;
      if (!returnQueues.has(key)) returnQueues.set(key, []);
      returnQueues.get(key)!.push(s.returnValue);
    }
  }

  function popReturnValue(func: string, depth: number): unknown | undefined {
    const q = returnQueues.get(`${func}:${depth}`);
    return q && q.length > 0 ? q.shift() : undefined;
  }

  function closeNode(node: CallNode, beforeStep: number) {
    if (node.endStep === undefined) {
      node.endStep = beforeStep;
      const rv = popReturnValue(node.func, node.depth);
      if (rv !== undefined) {
        node.returnValue = rv;
        node.hasReturn = true;
      }
    }
  }

  for (const step of steps) {
    // Skip return events and callsite events in main processing
    if (step.event === "return" || step.event === "callsite") continue;

    const { func, depth } = step.scope;
    if (SKIP_FUNCS.has(func)) continue;

    // Pop stack frames that are deeper than current (they've returned)
    while (stack.length > 0 && stack[stack.length - 1].depth > depth) {
      closeNode(stack.pop()!, step.step);
    }

    const top = stack.length > 0 ? stack[stack.length - 1] : null;

    // If same func + depth as top → continuation of current frame
    if (top && top.func === func && top.depth === depth) continue;

    // New frame
    const id = `${func}:${depth}:${counter++}`;
    const node: CallNode = {
      id,
      func,
      depth,
      args: { ...step.vars },
      hasReturn: false,
      startStep: step.step,
      children: [],
      parentId: top?.id,
    };
    nodeMap.set(id, node);
    if (top) {
      top.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push(node);
  }

  // Close remaining open frames
  const lastStep = steps.filter((s) => s.event !== "return").at(-1)?.step ?? 0;
  for (const node of [...stack]) {
    closeNode(node, lastStep);
  }

  return { roots, nodeMap };
}

// ── Active node / path ─────────────────────────────────────────────────────────

export function findActiveNode(roots: CallNode[], currentStep: number): CallNode | null {
  function search(nodes: CallNode[]): CallNode | null {
    for (const node of nodes) {
      const started = node.startStep <= currentStep;
      const notEnded = node.endStep === undefined || node.endStep >= currentStep;
      if (started && notEnded) {
        return search(node.children) ?? node;
      }
    }
    return null;
  }
  return search(roots);
}

export function getActivePath(roots: CallNode[], target: CallNode | null): Set<string> {
  const path = new Set<string>();
  if (!target) return path;
  const targetId = target.id;

  function find(nodes: CallNode[]): boolean {
    for (const node of nodes) {
      if (node.id === targetId || find(node.children)) {
        path.add(node.id);
        return true;
      }
    }
    return false;
  }
  find(roots);
  return path;
}

// ── Flat list for rendering ────────────────────────────────────────────────────

export interface FlatNode {
  node: CallNode;
  prefix: string;
}

export function flattenTree(
  roots: CallNode[],
  isCollapsed: (node: CallNode) => boolean
): FlatNode[] {
  const result: FlatNode[] = [];

  function visit(nodes: CallNode[], parentPrefix: string, isRoot: boolean) {
    nodes.forEach((node, idx) => {
      const isLast = idx === nodes.length - 1;
      const prefix = isRoot ? "" : parentPrefix + (isLast ? "└─ " : "├─ ");
      result.push({ node, prefix });
      if (!isCollapsed(node) && node.children.length > 0) {
        const childPrefix = isRoot ? "" : parentPrefix + (isLast ? "   " : "│  ");
        visit(node.children, childPrefix, false);
      }
    });
  }

  visit(roots, "", true);
  return result;
}

// ── Display helpers ────────────────────────────────────────────────────────────

export function getDisplayArgs(vars: Record<string, unknown>, maxCount = 4): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "function") continue;
    let display: string;
    if (v === null || v === undefined) {
      display = "None";
    } else if (typeof v === "boolean") {
      display = String(v);
    } else if (typeof v === "number") {
      display = String(v);
    } else if (typeof v === "string") {
      if (v.length > 12) continue;
      display = `"${v}"`;
    } else if (Array.isArray(v)) {
      const arr = v as unknown[];
      if (arr.length > 6) continue;
      display = `[${arr.slice(0, 4).join(",")}${arr.length > 4 ? "…" : ""}]`;
    } else {
      continue;
    }
    parts.push(`${k}=${display}`);
    if (parts.length >= maxCount) break;
  }
  return parts.join(", ");
}

export function formatReturnValue(v: unknown): string {
  if (v === undefined || v === null) return "None";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 12 ? `"${v.slice(0, 12)}…"` : `"${v}"`;
  if (Array.isArray(v)) {
    const arr = v as unknown[];
    if (arr.length === 0) return "[]";
    return `[${arr.slice(0, 3).join(",")}${arr.length > 3 ? "…" : ""}]`;
  }
  if (typeof v === "object") return "{…}";
  return String(v);
}

export function countNodes(roots: CallNode[]): number {
  let n = 0;
  function count(nodes: CallNode[]) {
    for (const node of nodes) { n++; count(node.children); }
  }
  count(roots);
  return n;
}
