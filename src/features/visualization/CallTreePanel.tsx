"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MergedTraceStep } from "@/types/prova";
import {
  buildCallTree,
  countNodes,
  findActiveNode,
  flattenTree,
  formatReturnValue,
  getActivePath,
  getDisplayArgs,
  type CallNode,
} from "./callTreeBuilder";

type Props = {
  traceSteps: MergedTraceStep[];
  /** 현재 재생 중인 step 번호 (MergedTraceStep.step) */
  currentStep: number;
  /** 특정 step으로 점프하는 콜백 (없으면 클릭 비활성화) */
  onJumpToStep?: (stepIndex: number) => void;
};

export function CallTreePanel({ traceSteps, currentStep, onJumpToStep }: Props) {
  const callTree = useMemo(() => buildCallTree(traceSteps), [traceSteps]);
  const activeNode = useMemo(
    () => findActiveNode(callTree.roots, currentStep),
    [callTree, currentStep],
  );
  const activePath = useMemo(
    () => getActivePath(callTree.roots, activeNode),
    [callTree.roots, activeNode],
  );

  // Manual fold / expand overrides
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());

  // Reset when trace changes
  useEffect(() => {
    setManualExpanded(new Set());
    setManualCollapsed(new Set());
  }, [traceSteps]);

  const isCollapsed = useCallback(
    (node: CallNode): boolean => {
      if (manualCollapsed.has(node.id)) return true;
      if (manualExpanded.has(node.id)) return false;
      // Auto-collapse: completed subtree that is not on the active path
      return (
        node.children.length > 0 &&
        node.endStep !== undefined &&
        node.endStep < currentStep &&
        !activePath.has(node.id)
      );
    },
    [manualCollapsed, manualExpanded, currentStep, activePath],
  );

  const toggleCollapse = useCallback((nodeId: string, currentlyCollapsed: boolean) => {
    if (currentlyCollapsed) {
      setManualExpanded((p) => new Set([...p, nodeId]));
      setManualCollapsed((p) => { const s = new Set(p); s.delete(nodeId); return s; });
    } else {
      setManualCollapsed((p) => new Set([...p, nodeId]));
      setManualExpanded((p) => { const s = new Set(p); s.delete(nodeId); return s; });
    }
  }, []);

  const flatNodes = useMemo(
    () => flattenTree(callTree.roots, isCollapsed),
    [callTree.roots, isCollapsed],
  );

  // Scroll active node into view
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeNode?.id]);

  const isEmpty = callTree.roots.length === 0;
  const totalCalls = isEmpty ? 0 : countNodes(callTree.roots);

  return (
    <div className="h-full flex flex-col bg-[#0b1119] select-none">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-prova-line flex items-center justify-between">
        <span className="text-[10px] text-prova-muted uppercase tracking-widest font-mono">
          Call Tree
        </span>
        {!isEmpty && (
          <span className="text-[10px] text-prova-muted font-mono">{totalCalls} calls</span>
        )}
      </div>
      {isEmpty && (
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[11px] text-prova-muted text-center leading-relaxed">
            함수 호출 없음
          </p>
        </div>
      )}

      {/* Tree list */}
      {!isEmpty && <div className="flex-1 overflow-auto prova-scrollbar py-1">
        {flatNodes.map(({ node, prefix }) => {
          const isActive = activeNode?.id === node.id;
          const isOnPath = activePath.has(node.id);
          const collapsed = isCollapsed(node);
          const isCompleted =
            node.endStep !== undefined && node.endStep < currentStep;
          const hasChildren = node.children.length > 0;
          const displayArgs = getDisplayArgs(node.args);

          return (
            <div
              key={node.id}
              ref={isActive ? activeRef : undefined}
              className={`flex items-start gap-0.5 px-2 py-[3px] cursor-default transition-colors ${
                isActive
                  ? "bg-[#2d2200]"
                  : isOnPath
                    ? "bg-[#0a1827] hover:bg-[#0c1e30]"
                    : "hover:bg-[#111820]"
              }`}
              onClick={() => {
                if (onJumpToStep && !isActive) onJumpToStep(node.startStep);
              }}
              title={onJumpToStep ? `Step ${node.startStep}으로 이동` : undefined}
            >
              {/* Unicode tree connector — monospace so characters align */}
              <span
                className="font-mono text-[11px] text-[#2d3a4f] whitespace-pre shrink-0 leading-5"
              >
                {prefix}
              </span>

              {/* Fold toggle */}
              {hasChildren ? (
                <button
                  className="shrink-0 w-3 h-5 flex items-center justify-center text-[9px] text-[#4a5568] hover:text-[#9ac7ff] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id, collapsed);
                  }}
                  title={collapsed ? "펼치기" : "접기"}
                >
                  {collapsed ? "▶" : "▼"}
                </button>
              ) : (
                <span className="shrink-0 w-3" />
              )}

              {/* Node content */}
              <div className="min-w-0 flex-1 leading-5 text-[11px] font-mono">
                {/* Function name */}
                <span
                  className={
                    isActive
                      ? "text-[#f2cc60] font-bold"
                      : isOnPath
                        ? "text-[#85c2ff]"
                        : isCompleted
                          ? "text-[#3d4860]"
                          : "text-[#8ba8cc]"
                  }
                >
                  {node.func}
                </span>

                {/* Args */}
                <span
                  className={
                    isActive
                      ? "text-[#c9a030]"
                      : isCompleted && !isOnPath
                        ? "text-[#2d3a4f]"
                        : "text-[#445270]"
                  }
                >
                  ({displayArgs})
                </span>

                {/* Return value */}
                {node.hasReturn && (
                  <span
                    className={`ml-1 ${
                      isCompleted && !isOnPath ? "text-[#2a4a38]" : "text-[#4caf80]"
                    }`}
                  >
                    → {formatReturnValue(node.returnValue)}
                  </span>
                )}

                {/* Active indicator dot */}
                {isActive && !node.hasReturn && (
                  <span className="ml-1 text-[#58a6ff] animate-pulse">●</span>
                )}

                {/* Collapsed children count badge */}
                {collapsed && node.children.length > 0 && (
                  <span className="ml-1.5 text-[9px] px-1 py-[1px] rounded border border-[#2d3a4f] text-[#4a5568]">
                    +{countChildrenDeep(node)} calls
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>}

      {/* Active call stack summary */}
      {activeNode && (
        <div className="shrink-0 border-t border-prova-line px-3 py-2">
          <div className="text-[9px] text-prova-muted uppercase tracking-widest mb-1">
            Active Frame
          </div>
          <div className="text-[11px] font-mono text-[#f2cc60] truncate">
            {activeNode.func}({getDisplayArgs(activeNode.args, 6)})
          </div>
          <div className="text-[9px] text-prova-muted font-mono mt-0.5">
            depth {activeNode.depth} · step {activeNode.startStep}
          </div>
        </div>
      )}
    </div>
  );
}

function countChildrenDeep(node: CallNode): number {
  let n = 0;
  function count(children: CallNode[]) {
    for (const c of children) { n++; count(c.children); }
  }
  count(node.children);
  return n;
}
