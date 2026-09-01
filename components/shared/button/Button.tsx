import React, { useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { useTheme, type Theme } from "@/theme";
import { verticalScale } from "@/utils/scale";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "icon";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "medium",
  isLoading = false,
  icon,
  leftIcon,
  rightIcon,
  buttonStyle,
  textStyle,
  disabled = false,
  ...rest
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const getButtonStyles = (): ViewStyle => {
    const baseStyle = styles.button;
    const variantStyle = styles[`button_${variant}` as keyof typeof styles];
    const sizeStyle = styles[`button_${size}` as keyof typeof styles];
    const disabledStyle = disabled ? styles.button_disabled : {};

    return {
      ...baseStyle,
      ...variantStyle,
      ...sizeStyle,
      ...disabledStyle,
      ...buttonStyle,
    } as ViewStyle;
  };

  const getTextStyles = (): TextStyle => {
    const baseStyle = styles.text;
    const variantStyle = styles[`text_${variant}` as keyof typeof styles];
    const sizeStyle = styles[`text_${size}` as keyof typeof styles];
    const disabledStyle = disabled ? styles.text_disabled : {};

    return {
      ...baseStyle,
      ...variantStyle,
      ...sizeStyle,
      ...disabledStyle,
      ...textStyle,
    } as TextStyle;
  };

  const renderContent = () => {
    if (isLoading) {
      let loaderColor = theme.colors.primary.main;
      if (variant === "primary") {
        loaderColor = theme.colors.white;
      } else if (variant === "secondary") {
        loaderColor = theme.colors.text.primary;
      } else if (variant === "tertiary") {
        loaderColor = theme.colors.primary.main;
      }
      return <ActivityIndicator color={loaderColor} />;
    }

    if (icon && !title) {
      return icon;
    }

    return (
      <>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        {title && <Text style={getTextStyles()}>{title}</Text>}
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </>
    );
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...rest}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const makeStyles = (theme: Theme) => {
  const getNativeTextStyle = (typographyStyle: TextStyle): Omit<TextStyle, "cursor"> => {
    const { cursor, ...nativeStyle } = typographyStyle ?? {};
    return nativeStyle;
  };

  const nativeButtonTypography = getNativeTextStyle(theme.typography.manrope.button);
  const nativeButtonSmallTypography = getNativeTextStyle(theme.typography.manrope.button_small);
  const nativeButtonMediumTypography = getNativeTextStyle(theme.typography.manrope.button_medium);
  const nativeButtonLargeTypography = getNativeTextStyle(theme.typography.manrope.button_large);

  return StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 24,
    },
    button_primary: {
      backgroundColor: theme.colors.primary.main,
    },
    button_secondary: {
      backgroundColor: theme.colors.gray[200],
    },
    button_tertiary: {
      backgroundColor: "transparent",
    },
    button_icon: {
      backgroundColor: "transparent",
      padding: verticalScale(8),
    },
    button_small: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    button_medium: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    button_large: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    button_disabled: {
      opacity: 0.5,
    },
    text: {
      textAlign: "center",
      ...nativeButtonTypography,
    },
    text_primary: {
      color: theme.colors.white,
    },
    text_secondary: {
      color: theme.colors.text.primary,
    },
    text_tertiary: {
      color: theme.colors.primary.main,
    },
    text_icon: {
      color: theme.colors.text.primary,
    },
    text_small: {
      ...(nativeButtonSmallTypography ?? nativeButtonTypography),
    },
    text_medium: {
      ...(nativeButtonMediumTypography ?? nativeButtonTypography),
    },
    text_large: {
      ...(nativeButtonLargeTypography ?? nativeButtonTypography),
    },
    text_disabled: {
      opacity: 0.5,
    },
    iconLeft: {
      marginRight: theme.spacing.xs,
    },
    iconRight: {
      marginLeft: theme.spacing.xs,
    },
  });
};
