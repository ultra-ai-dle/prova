import { useState, useCallback } from "react";
import type { ExampleCategory, ExampleItem } from "@/data/examples";

interface GalleryState {
  isOpen: boolean;
  selectedCategory: ExampleCategory;
  confirmTarget: ExampleItem | null;
}

export function useGallery() {
  const [state, setState] = useState<GalleryState>({
    isOpen: false,
    selectedCategory: "sorting",
    confirmTarget: null,
  });

  const open = useCallback(() => {
    setState((s) => ({ ...s, isOpen: true, confirmTarget: null }));
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false, confirmTarget: null }));
  }, []);

  const selectCategory = useCallback((cat: ExampleCategory) => {
    setState((s) => ({ ...s, selectedCategory: cat, confirmTarget: null }));
  }, []);

  const requestConfirm = useCallback((item: ExampleItem) => {
    setState((s) => ({ ...s, confirmTarget: item }));
  }, []);

  const cancelConfirm = useCallback(() => {
    setState((s) => ({ ...s, confirmTarget: null }));
  }, []);

  return { ...state, open, close, selectCategory, requestConfirm, cancelConfirm };
}
