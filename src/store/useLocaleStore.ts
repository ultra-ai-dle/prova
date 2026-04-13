"use client";

import { create } from "zustand";

export type Locale = "ko" | "en";

const LOCALE_KEY = "prova:locale";

function readSavedLocale(): Locale {
  if (typeof window === "undefined") return "ko";
  const saved = localStorage.getItem(LOCALE_KEY);
  return saved === "en" ? "en" : "ko";
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: readSavedLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // ignore storage failures
    }
    set({ locale });
  },
}));
