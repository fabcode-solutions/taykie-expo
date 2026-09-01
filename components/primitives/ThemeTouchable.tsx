//
import { useTheme } from "@/theme/hooks";
import React from "react";
import { TouchableOpacity, TouchableOpacityProps, StyleSheet } from "react-native";

export type ThemeTouchableProps = TouchableOpacityProps & {
  backgroundColor?: string;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  padded?: boolean | "xs" | "sm" | "md" | "lg" | "xl";
  margin?: boolean | "xs" | "sm" | "md" | "lg" | "xl";
  rounded?: boolean | "sm" | "md" | "lg" | "full";
  centered?: boolean;
  row?: boolean;
};

export const ThemeTouchable: React.FC<ThemeTouchableProps> = ({
  style,
  backgroundColor,
  elevation = 0,
  padded = false,
  margin = false,
  rounded = false,
  centered = false,
  row = false,
  activeOpacity = 0.7,
  children,
  ...otherProps
}) => {
  const theme = useTheme();

  // Get padding value
  const getPadding = () => {
    if (padded === false) return undefined;
    if (padded === true) return theme.spacing.md;

    switch (padded) {
      case "xs":
        return theme.spacing.xs;
      case "sm":
        return theme.spacing.sm;
      case "md":
        return theme.spacing.md;
      case "lg":
        return theme.spacing.lg;
      case "xl":
        return theme.spacing.xl;
      default:
        return theme.spacing.md;
    }
  };

  // Get margin value
  const getMargin = () => {
    if (margin === false) return undefined;
    if (margin === true) return theme.spacing.md;

    switch (margin) {
      case "xs":
        return theme.spacing.xs;
      case "sm":
        return theme.spacing.sm;
      case "md":
        return theme.spacing.md;
      case "lg":
        return theme.spacing.lg;
      case "xl":
        return theme.spacing.xl;
      default:
        return theme.spacing.md;
    }
  };

  // Get border radius value
  const getBorderRadius = () => {
    if (rounded === false) return undefined;
    if (rounded === true) return theme.spacing.sm;

    switch (rounded) {
      case "sm":
        return theme.spacing.xs;
      case "md":
        return theme.spacing.sm;
      case "lg":
        return theme.spacing.md;
      case "full":
        return 9999;
      default:
        return theme.spacing.sm;
    }
  };

  // Combine styles
  const combinedStyle = [
    { backgroundColor: backgroundColor ?? theme.colors.background.default },
    getPadding() !== undefined && { padding: getPadding() },
    getMargin() !== undefined && { margin: getMargin() },
    getBorderRadius() !== undefined && { borderRadius: getBorderRadius() },
    elevation > 0 && theme.shadows[elevation],
    centered && styles.centered,
    row && styles.row,
    style,
  ];

  return (
    <TouchableOpacity style={combinedStyle} activeOpacity={activeOpacity} {...otherProps}>
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
  },
});
