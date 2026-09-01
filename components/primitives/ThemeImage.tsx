import { useTheme } from "@/theme/hooks";
import React from "react";
import { Image, ImageProps, StyleSheet } from "react-native";

export type ThemeImageProps = Omit<ImageProps, "source"> & {
  source: number | { uri: string };
  size?: number | "xs" | "sm" | "md" | "lg" | "xl" | "fill";
  rounded?: boolean | "sm" | "md" | "lg" | "full";
  circle?: boolean;
  margin?: boolean | "xs" | "sm" | "md" | "lg" | "xl";
};

export const ThemeImage: React.FC<ThemeImageProps> = ({
  style,
  source,
  size = "md",
  rounded = false,
  circle = false,
  margin = false,
  ...otherProps
}) => {
  const theme = useTheme();

  // Get size value
  const getSize = (): number | undefined => {
    if (size === "fill") return undefined;
    if (typeof size === "number") return size;

    switch (size) {
      case "xs":
        return theme.spacing.lg;
      case "sm":
        return theme.spacing.xl;
      case "md":
        return theme.spacing.xxl;
      case "lg":
        return theme.spacing.xxxl;
      case "xl":
        return 96;
      default:
        return theme.spacing.xxl;
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
    if (circle) return getSize() ? getSize()! / 2 : undefined;
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
  const sizeValue = getSize();
  const combinedStyle = [
    sizeValue !== undefined && { width: sizeValue, height: sizeValue },
    size === "fill" && styles.fill,
    getBorderRadius() !== undefined && { borderRadius: getBorderRadius() },
    getMargin() !== undefined && { margin: getMargin() },
    style,
  ];

  return <Image source={source} style={combinedStyle} {...otherProps} />;
};

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
