import { ColorPalette, lightColors, darkColors } from "./tokens/colors";
import { typography } from "./tokens/typography";
import { spacing } from "./tokens/spacing";
import { lightShadows, darkShadows, ShadowsDefinition } from "./tokens/shadows";

export type ThemeMode = "light" | "dark" | "system";

export interface Theme {
  mode: "light" | "dark";
  colors: ColorPalette;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: ShadowsDefinition;
}

export const createTheme = (mode: "light" | "dark"): Theme => ({
  mode,
  colors: mode === "light" ? lightColors : darkColors,
  typography,
  spacing,
  shadows: mode === "light" ? lightShadows : darkShadows,
});

// Light and dark theme instances
export const lightTheme = createTheme("light");
export const darkTheme = createTheme("dark");
