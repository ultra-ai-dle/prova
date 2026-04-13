export type { Translations } from "./types";
export { ko } from "./ko";
export { en } from "./en";

import { ko } from "./ko";
import { en } from "./en";
import { useLocaleStore } from "@/store/useLocaleStore";

/** Returns the full translation object for the current locale. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return locale === "en" ? en : ko;
}
