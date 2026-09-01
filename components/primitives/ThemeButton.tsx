import React from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { ThemeView } from "./ThemeView";
import { useTheme } from "@/theme/hooks";
import { ThemeText } from "./ThemeText";
import { moderateScale, scale } from "@/utils/scale";

export type ButtonVariant = "filled" | "outlined" | "text";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonColor = "primary" | "secondary" | "success" | "error" | "warning" | "info";

export interface ThemeButtonProps {
  onPress?: () => void;
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  uppercase?: boolean;
}

export const ThemeButton: React.FC<ThemeButtonProps> = ({
  onPress,
  title,
  variant = "filled",
  size = "md",
  color = "primary",
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  uppercase = false,
}) => {
  const theme = useTheme();

  // Get base color from theme
  const getBaseColor = () => theme.colors[color].main;
  const getContrastColor = () => theme.colors[color].contrast;

  // Get padding based on size
  const getPadding = () => {
    switch (size) {
      case "sm":
        return { vertical: theme.spacing.xs, horizontal: theme.spacing.sm };
      case "md":
        return { vertical: theme.spacing.sm, horizontal: theme.spacing.md };
      case "lg":
        return { vertical: theme.spacing.md, horizontal: theme.spacing.lg };
    }
  };

  // Get background color based on variant and state
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.gray[300];
    if (variant === "filled") return getBaseColor();
    return "transparent";
  };

  // Get border style based on variant
  const getBorderStyle = () => {
    if (variant === "outlined") {
      return {
        borderWidth: scale(1),
        borderColor: disabled ? theme.colors.gray[300] : getBaseColor(),
      };
    }
    return {};
  };

  // Get text color based on variant and state
  const getTextColor = () => {
    if (disabled) return theme.colors.text.disabled;
    if (variant === "filled") return getContrastColor();
    return getBaseColor();
  };

  // Button padding
  const { vertical, horizontal } = getPadding();

  // Get font size based on button size
  const getFontVariant = () => {
    switch (size) {
      case "sm":
        return "manrope.body2Bold";
      case "md":
        return "manrope.body1Bold";
      case "lg":
        return "manrope.subtitle1";
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          paddingVertical: vertical,
          paddingHorizontal: horizontal,
          opacity: disabled ? 0.6 : 1,
        },
        getBorderStyle(),
        variant === "text" && styles.textButton,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <ThemeView row centered style={styles.content}>
        {leftIcon && !loading && <ThemeView style={styles.leftIcon}>{leftIcon}</ThemeView>}

        {loading && (
          <ActivityIndicator
            size={size === "sm" ? "small" : "small"}
            color={getTextColor()}
            style={styles.loader}
          />
        )}

        <ThemeText
          variant={getFontVariant()}
          color={getTextColor()}
          uppercase={uppercase}
          style={[loading && styles.hiddenText, textStyle]}
        >
          {title}
        </ThemeText>

        {rightIcon && !loading && <ThemeView style={styles.rightIcon}>{rightIcon}</ThemeView>}
      </ThemeView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: moderateScale(8),
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    backgroundColor: "transparent",
    paddingHorizontal: scale(8),
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  leftIcon: {
    marginRight: scale(8),
  },
  rightIcon: {
    marginLeft: scale(8),
  },
  loader: {
    marginRight: scale(8),
  },
  hiddenText: {
    opacity: 0,
  },
});
