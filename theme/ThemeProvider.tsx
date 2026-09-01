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
  const {
    mode: themeMode,
    systemPrefersDark,
    setSystemPrefersDark,
    setThemeMode,
    toggleTheme,
  } = useThemeStore();

  // Determine which theme mode to use
  const resolvedMode = useMemo(() => {
    if (themeMode === "system") {
      return systemPrefersDark ? "light" : "light";
    }
    return themeMode;
  }, [themeMode, systemPrefersDark]);

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
