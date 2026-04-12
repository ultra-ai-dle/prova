import { useEffect, useRef } from "react";

type DragType = "left" | "right" | "var-input" | "input-output" | "calltree" | null;

const CALLTREE_MIN = 140;
const CALLTREE_MAX = 400;

export function useDragResize({
  setPaneWidths,
  setRightHeights,
  setCallTreeWidth,
  setCallTreeOpen,
}: {
  setPaneWidths: React.Dispatch<React.SetStateAction<{ left: number; center: number; right: number }>>;
  setRightHeights: React.Dispatch<React.SetStateAction<{ variable: number; input: number; output: number }>>;
  setCallTreeWidth: React.Dispatch<React.SetStateAction<number>>;
  setCallTreeOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const splitRootRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const dragTypeRef = useRef<DragType>(null);
  const dragAnchorRef = useRef<{
    leftCenterTotal: number;
    leftWidth: number;
  } | null>(null);
  const callTreeDragAnchorRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragTypeRef.current || !splitRootRef.current) return;

      if (dragTypeRef.current === "calltree") {
        const anchor = callTreeDragAnchorRef.current;
        if (!anchor) return;
        const dx = e.clientX - anchor.startX;
        const raw = anchor.startWidth + dx;
        const next = Math.max(CALLTREE_MIN, Math.min(CALLTREE_MAX, raw));
        setCallTreeWidth(next);
        return;
      }

      if (
        (dragTypeRef.current === "var-input" ||
          dragTypeRef.current === "input-output") &&
        rightPaneRef.current
      ) {
        const rect = rightPaneRef.current.getBoundingClientRect();
        const minPct = (140 / Math.max(rect.height, 1)) * 100;
        const yPct = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 100;

        setRightHeights((prev) => {
          if (dragTypeRef.current === "var-input") {
            const total = prev.variable + prev.input;
            const nextVariable = Math.min(
              Math.max(yPct, minPct),
              total - minPct,
            );
            return {
              ...prev,
              variable: nextVariable,
              input: total - nextVariable,
            };
          }
          const total = prev.input + prev.output;
          const inputFromTop = yPct - prev.variable;
          const nextInput = Math.min(
            Math.max(inputFromTop, minPct),
            total - minPct,
          );
          return {
            ...prev,
            input: nextInput,
            output: total - nextInput,
          };
        });
        return;
      }

      const rect = splitRootRef.current.getBoundingClientRect();
      const minPct = (280 / Math.max(rect.width, 1)) * 100;
      const xPct = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100;

      setPaneWidths((prev) => {
        if (dragTypeRef.current === "left") {
          const total =
            dragAnchorRef.current?.leftCenterTotal ?? prev.left + prev.center;
          const nextLeft = Math.min(Math.max(xPct, minPct), total - minPct);
          return {
            ...prev,
            left: nextLeft,
            center: total - nextLeft,
          };
        }
        const leftWidth = dragAnchorRef.current?.leftWidth ?? prev.left;
        const total = 100 - leftWidth;
        const centerFromLeft = xPct - leftWidth;
        const nextCenter = Math.min(
          Math.max(centerFromLeft, minPct),
          total - minPct,
        );
        return {
          ...prev,
          left: leftWidth,
          center: nextCenter,
          right: total - nextCenter,
        };
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (dragTypeRef.current === "calltree") {
        const anchor = callTreeDragAnchorRef.current;
        if (anchor) {
          const dx = e.clientX - anchor.startX;
          const raw = anchor.startWidth + dx;
          if (raw < CALLTREE_MIN / 2) {
            setCallTreeOpen(true);
          } else {
            setCallTreeOpen(true);
            setCallTreeWidth(
              Math.max(CALLTREE_MIN, Math.min(CALLTREE_MAX, raw)),
            );
          }
        }
      }
      dragTypeRef.current = null;
      dragAnchorRef.current = null;
      callTreeDragAnchorRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [setPaneWidths, setRightHeights, setCallTreeWidth, setCallTreeOpen]);

  return {
    splitRootRef,
    rightPaneRef,
    dragTypeRef,
    dragAnchorRef,
    callTreeDragAnchorRef,
    CALLTREE_MIN,
    CALLTREE_MAX,
  };
}
