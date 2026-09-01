import { useTheme, type Theme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "text";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// Reusable Button Component
export const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  fullWidth = true,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}: ButtonProps) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const getButtonStyle = () => {
    switch (variant) {
      case "primary":
        return styles.primaryButton;
      case "secondary":
        return styles.secondaryButton;
      case "outline":
        return styles.outlineButton;
      case "text":
        return styles.textButton;
    }
  };

  const getButtonTextStyle = () => {
    switch (variant) {
      case "primary":
        return styles.primaryButtonText;
      case "secondary":
        return styles.secondaryButtonText;
      case "outline":
        return styles.outlineButtonText;
      case "text":
        return styles.textButtonText;
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case "small":
        return styles.smallButton;
      case "medium":
        return styles.mediumButton;
      case "large":
        return styles.largeButton;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        getButtonSize(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      className="GascogneSerial-Regular"
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary"
              ? theme.colors.primary.dark
              : variant === "secondary"
                ? theme.colors.warning.contrast
                : theme.colors.primary.main
          }
        />
      ) : (
        <>
          {leftIcon && <View>{leftIcon}</View>}
          <Text style={[getButtonTextStyle(), disabled && styles.disabledButtonText, textStyle]}>
            {title}
          </Text>
          {rightIcon && <View>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    button: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 999,
      gap: scale(5),
    },
    fullWidth: {
      width: "100%",
    },
    primaryButton: {
      backgroundColor: theme.colors.primary.main,
      shadowColor: theme.colors.primary.main,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(4),
      elevation: 5,
      flexShrink: 1,
    },
    secondaryButton: {
      backgroundColor: theme.colors.warning.main,
      shadowColor: theme.colors.warning.main,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(4),
      elevation: 5,
    },
    outlineButton: {
      backgroundColor: "transparent",
      borderWidth: scale(1),
      borderColor: theme.colors.primary.main,
    },
    textButton: {
      backgroundColor: "transparent",
    },
    smallButton: {
      minHeight: verticalScale(40),
      paddingHorizontal: scale(16),
    },
    mediumButton: {
      minHeight: verticalScale(56),
      paddingHorizontal: scale(24),
    },
    largeButton: {
      minHeight: verticalScale(64),
      paddingHorizontal: scale(32),
    },
    disabledButton: {
      backgroundColor: theme.colors.gray[300],
      shadowOpacity: 0,
      elevation: 0,
    },
    primaryButtonText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(18),
      fontWeight: "400",
      fontFamily: theme.typography.gs.title.fontFamily,
      flexShrink: 1,
    },
    secondaryButtonText: {
      color: theme.colors.warning.contrast,
      fontSize: moderateScale(18),
      fontWeight: "500",
      fontFamily: theme.typography.gs.title.fontFamily,
    },
    outlineButtonText: {
      color: theme.colors.primary.main,
      fontSize: moderateScale(18),
      fontWeight: "500",
      fontFamily: theme.typography.gs.title.fontFamily,
    },
    textButtonText: {
      color: theme.colors.primary.main,
      fontSize: moderateScale(18),
      fontWeight: "500",
      fontFamily: theme.typography.gs.title.fontFamily,
    },
    disabledButtonText: {
      color: theme.colors.text.disabled,
    },
  });
