import { useState, useCallback } from "react";
import type { ExampleCategory, ExampleItem, ExampleVariant } from "@/data/examples";

interface GalleryState {
  isOpen: boolean;
  selectedCategory: ExampleCategory;
  confirmTarget: ExampleItem | null;
  confirmVariant: ExampleVariant | null;
}

export function useGallery() {
  const [state, setState] = useState<GalleryState>({
    isOpen: false,
    selectedCategory: "sorting",
    confirmTarget: null,
    confirmVariant: null,
  });

  const open = useCallback(() => {
    setState((s) => ({ ...s, isOpen: true, confirmTarget: null, confirmVariant: null }));
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false, confirmTarget: null, confirmVariant: null }));
  }, []);

  const selectCategory = useCallback((cat: ExampleCategory) => {
    setState((s) => ({ ...s, selectedCategory: cat, confirmTarget: null, confirmVariant: null }));
  }, []);

  const requestConfirm = useCallback((item: ExampleItem, variant: ExampleVariant) => {
    setState((s) => ({ ...s, confirmTarget: item, confirmVariant: variant }));
  }, []);

  const cancelConfirm = useCallback(() => {
    setState((s) => ({ ...s, confirmTarget: null, confirmVariant: null }));
  }, []);

  return { ...state, open, close, selectCategory, requestConfirm, cancelConfirm };
}
