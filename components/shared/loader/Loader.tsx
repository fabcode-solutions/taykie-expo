import React from "react";
import { View, ActivityIndicator, Text, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/theme/hooks";

interface LoaderProps {
  size?: "small" | "large";
  color?: string;
  text?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const Loader: React.FC<LoaderProps> = ({
  size = "large",
  color,
  text,
  fullScreen = true,
  style,
}) => {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    padding: theme.spacing.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  const fullScreenStyle: ViewStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.backdrop,
    zIndex: 10,
  };

  const textStyle: TextStyle = {
    ...theme.typography.manrope.body2,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: "center" as const,
  };

  const rootStyle: ViewStyle[] = [
    containerStyle,
    fullScreen ? fullScreenStyle : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <View style={rootStyle}>
      <ActivityIndicator size={size} color={color ?? theme.colors.activityIndicator} />
      {text && <Text style={textStyle}>{text}</Text>}
    </View>
  );
};
