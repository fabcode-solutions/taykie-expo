import { persist } from "zustand/middleware";
import { create, mmkvJSONStateStorage } from "./stateStorage";
import i18n from "@/i18n";

export type LanguageOption = {
  code: string; // i18n language code
  label: string; // display name
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "es", label: "Español" },
  { code: "en-US", label: "English (US)" },
];

type State = {
  selectedLanguage: string; // i18n code
};

type Actions = {
  setLanguage: (code: string) => void;
};

const initialState: State = {
  selectedLanguage: "en-US", // default Spanish
};

export const useLanguageStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initialState,
      setLanguage: (code: string) => {
        set({ selectedLanguage: code });
        try {
          i18n.changeLanguage(code);
        } catch (e) {
          console.warn("Failed to change language", e);
        }
      },
    }),
    {
      name: "language-store",
      storage: mmkvJSONStateStorage,
      partialize: (state) => ({ selectedLanguage: state.selectedLanguage }),
    },
  ),
);
