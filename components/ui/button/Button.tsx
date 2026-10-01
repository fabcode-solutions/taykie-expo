import { useTheme } from "@/theme";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
interface ButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  btnText: string;
  btnTextClassName?: string;
  className?: string;
}
const Button = ({
  onPress,
  btnText,
  btnTextClassName,
  className,
  loading = false,
  disabled = false,
}: ButtonProps) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      // Ignore taps while loading — it used to stay tappable and fire twice.
      disabled={loading || disabled}
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
      className={`rounded-full  py-[12px] px-[34px] border border-slateCharcoal ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary.dark} />
      ) : (
        <Text
          className={`text-center text-sm font-Manrope-Bold text-slateCharcoal font-bold ${btnTextClassName}`}
        >
          {btnText}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
