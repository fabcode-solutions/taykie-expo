import React, { createContext, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useThemeStore, ThemeMode } from "@/stores/themeStore";
import { Theme, createTheme } from "./theme";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

// Create context with default values
export const ThemeContext = createContext<ThemeContextType>({
  theme: createTheme("light"),
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  // mode/systemPrefersDark themselves aren't read while locked to light (see
  // below) — only their setters, so the store stays populated for whenever
  // dark mode is re-enabled.
  const { setSystemPrefersDark, setThemeMode, toggleTheme } = useThemeStore();

  // Locked to light per brief §Priority 3 until a proper dark theme ships —
  // see the comment on userInterfaceStyle in app.config.ts. themeMode/
  // systemPrefersDark are still tracked (persisted store, system-scheme
  // listener below) so re-enabling dark mode later is a one-line change
  // here, not a re-plumb.
  const resolvedMode = "light";

  // Create theme object based on resolved mode
  const theme = useMemo(() => {
    return createTheme(resolvedMode);
  }, [resolvedMode]);

  // Update system preference when device theme changes
  useEffect(() => {
    if (deviceColorScheme) {
      setSystemPrefersDark(deviceColorScheme === "dark");
    }
  }, [deviceColorScheme, setSystemPrefersDark]);

  // Context value
  const contextValue = useMemo(
    () => ({
      theme,
      toggleTheme,
      setThemeMode,
    }),
    [theme, toggleTheme, setThemeMode],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
