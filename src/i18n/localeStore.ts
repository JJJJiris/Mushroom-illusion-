import { create } from "zustand";
import type { Locale } from "./translations";

type LocaleState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "zh",
  setLocale: (l) => set({ locale: l }),
}));
