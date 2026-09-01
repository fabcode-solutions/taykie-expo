import { persist } from "zustand/middleware";
import { Appearance } from "react-native";
import { mmkvJSONStateStorage, create } from "./stateStorage";

export type ThemeMode = "light" | "dark" | "system";

type State = {
  mode: ThemeMode;
  systemPrefersDark: boolean;
};

type Actions = {
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setSystemPrefersDark: (prefersDark: boolean) => void;
  reset: () => void;
};

const initialState: State = {
  mode: "system",
  systemPrefersDark: false,
};

export const useThemeStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setThemeMode: (mode) => set({ mode }),

      toggleTheme: () => {
        const { mode } = get();
        if (mode === "light") {
          set({ mode: "dark" });
        } else if (mode === "dark") {
          set({ mode: "light" });
        } else {
          // If system, toggle to opposite of current system preference
          const { systemPrefersDark } = get();
          set({ mode: systemPrefersDark ? "light" : "light" });
        }
      },

      setSystemPrefersDark: (prefersDark) => set({ systemPrefersDark: prefersDark }),

      reset: () => set(initialState),
    }),
    {
      name: "theme-store",
      storage: mmkvJSONStateStorage,
    },
  ),
);
