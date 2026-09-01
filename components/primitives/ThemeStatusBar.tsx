import React from "react";
import { StatusBar, StatusBarProps } from "expo-status-bar";
import { useDarkMode } from "@/theme/hooks";
import { Platform } from "react-native";

export interface ThemeStatusBarProps extends Omit<StatusBarProps, "style"> {
  /**
   * Override the automatic theme-based style
   * If not provided, will automatically use "light" for dark mode and "dark" for light mode
   */
  style?: "light" | "dark" | "auto";
}

/**
 * ThemeStatusBar component
 *
 * A themed wrapper around expo-status-bar's StatusBar that automatically
 * adjusts the status bar style based on the current theme mode.
 *
 * In dark mode: Uses "light" style (light content for dark backgrounds)
 * In light mode: Uses "dark" style (dark content for light backgrounds)
 *
 * This component is reactive to theme changes, so the status bar will
 * automatically update when the user changes their device theme or
 * the app theme preference.
 */
export function ThemeStatusBar({ style = "auto", ...props }: ThemeStatusBarProps) {
  const isDarkMode = useDarkMode();

  const resolvedStyle = style === "auto" ? (isDarkMode ? "light" : "dark") : style;

  return <StatusBar style={resolvedStyle} {...props} translucent={Platform.OS === "android"} />;
}
