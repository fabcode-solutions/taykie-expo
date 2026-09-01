import { useTextColor, useTheme } from "@/theme/hooks";
import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import type { FontWeight } from "@/theme";

export type TextVariant =
  | "manrope.h1"
  | "manrope.h2"
  | "manrope.h3"
  | "manrope.h4"
  | "manrope.h5"
  | "manrope.h6"
  | "manrope.body1"
  | "manrope.body2"
  | "manrope.body1Bold"
  | "manrope.body2Bold"
  | "manrope.subtitle"
  | "manrope.subtitle2"
  | "manrope.caption"
  | "manrope.overline"
  | "manrope.button"
  | "manrope.button_small"
  | "manrope.button_medium"
  | "manrope.button_large"
  | "manrope.brandBody"
  | "manrope.body"
  | "gs.title"
  | "gs.h2"
  | "gs.link";

export type ThemeTextProps = TextProps & {
  variant?: TextVariant;
  color?: string;
  align?: "auto" | "left" | "right" | "center" | "justify";
  numberOfLines?: number;
  fontWeight?: FontWeight;
  italic?: boolean;
  underline?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  capitalize?: boolean;
};

export const ThemeText: React.FC<ThemeTextProps> = ({
  style,
  variant = "manrope.body1",
  color,
  align,
  fontWeight,
  italic = false,
  underline = false,
  uppercase = false,
  lowercase = false,
  capitalize = false,
  children,
  ...otherProps
}) => {
  const theme = useTheme();
  const defaultTextColor = useTextColor();

  // Resolve typography style from dotted variant paths
  const getVariantStyle = () => {
    const pathSegments = variant.split(".");
    let resolvedStyle: any = theme.typography;

    for (const segment of pathSegments) {
      if (resolvedStyle && typeof resolvedStyle === "object" && segment in resolvedStyle) {
        resolvedStyle = resolvedStyle[segment as keyof typeof resolvedStyle];
      } else {
        resolvedStyle = undefined;
        break;
      }
    }

    return resolvedStyle && typeof resolvedStyle === "object"
      ? (resolvedStyle as TextProps["style"])
      : theme.typography.manrope.body1;
  };

  // Transform text if needed
  const transformText = (text: React.ReactNode): React.ReactNode => {
    if (typeof text !== "string") return text;

    let transformedText = text;

    if (uppercase) transformedText = transformedText.toUpperCase();
    else if (lowercase) transformedText = transformedText.toLowerCase();
    else if (capitalize) {
      transformedText = transformedText
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }

    return transformedText;
  };

  // Combine styles
  const variantStyle = getVariantStyle();
  const textStyle: (TextProps["style"] | undefined)[] = [
    variantStyle,
    { color: color ?? defaultTextColor },
    align && { textAlign: align },
  ];

  // Handle fontWeight prop
  if (fontWeight) {
    textStyle.push({ fontWeight });
  }

  if (italic) {
    // Only apply style if variant isn't already italic by font family name
    if (!variantStyle?.fontFamily?.toLowerCase().includes("italic")) {
      textStyle.push(styles.italic);
    }
  }
  if (underline) {
    textStyle.push(styles.underline);
  }

  // Add the custom style prop last so it can override anything
  textStyle.push(style);
  return (
    <Text style={textStyle} {...otherProps}>
      {transformText(children)}
    </Text>
  );
};

const styles = StyleSheet.create({
  italic: {
    fontStyle: "italic",
  },
  underline: {
    textDecorationLine: "underline",
  },
});
