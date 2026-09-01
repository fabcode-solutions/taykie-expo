import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";
import { useThemeStore } from "@/stores/themeStore";
import { ColorPalette } from "./tokens/colors";

// Hook to access the entire theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context.theme;
};

// Hook to check if dark mode is active
export const useDarkMode = () => {
  const theme = useTheme();
  return theme.mode === "dark";
};

// Hook to get text color based on theme
export const useTextColor = (
  variant: "primary" | "secondary" | "disabled" | "hint" | "subtle" = "primary",
) => {
  const theme = useTheme();
  return theme.colors.text[variant];
};

// Hook to get background color based on theme
export const useBackgroundColor = (variant: "default" | "paper" | "elevated" = "default") => {
  const theme = useTheme();
  return theme.colors.background[variant];
};

// Convenience hook for getting colors
export const useColors = () => {
  const theme = useTheme();
  return theme.colors;
};

// Convenience hook for getting typography
export const useTypography = () => {
  const theme = useTheme();
  return theme.typography;
};

// Convenience hook for getting spacing
export const useSpacing = () => {
  const theme = useTheme();
  return theme.spacing;
};

// Convenience hook for getting shadows
export const useShadows = () => {
  const theme = useTheme();
  return theme.shadows;
};

// Standalone hook to get current active theme mode without using context
// Useful for components that just need to know the theme but don't need other theme properties
export const useActiveThemeMode = (): "light" | "dark" => {
  const { mode, systemPrefersDark } = useThemeStore();
  return mode === "system" ? (systemPrefersDark ? "light" : "light") : mode;
};

// Props type for useThemeColor
export type UseThemeColorProps = { light?: string; dark?: string };

/**
 * A hook to get a specific color from the theme, with an option to override via props.
 * Useful for components that need a specific color that might also be customizable.
 */
export function useThemeColor(props: UseThemeColorProps, colorName: keyof ColorPalette): string {
  const theme = useTheme();
  const colorFromProps = props[theme.mode as keyof UseThemeColorProps];

  if (colorFromProps) {
    return colorFromProps;
  }
  // Type assertion needed as colorName is keyof ColorPalette, and theme.colors is ColorPalette
  return theme.colors[colorName as keyof typeof theme.colors] as string;
}
