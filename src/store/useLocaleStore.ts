"use client";

import { create } from "zustand";

export type Locale = "ko" | "en";

const LOCALE_KEY = "prova:locale";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  hydrateFromStorage: () => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "ko", // SSR-safe default — client hydrates via hydrateFromStorage()
  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // ignore storage failures
    }
    set({ locale });
  },
  hydrateFromStorage: () => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      if (saved === "en") set({ locale: "en" });
    } catch {
      // ignore storage failures
    }
  },
}));
