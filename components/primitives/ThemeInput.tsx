import { useTheme, getManropeStyle } from "@/theme";
import React, { useState } from "react";
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from "react-native";
import { ThemeText } from "./ThemeText";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
// import { SystemUITextInput } from "./SystemUITextInput"; // Commented out as file is not found

export interface ThemeInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
}

export const ThemeInput: React.FC<ThemeInputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputContainerStyle,
  style,
  ...inputProps
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Handle focus state
  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    inputProps.onFocus?.(e);
  };

  // Handle blur state
  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    inputProps.onBlur?.(e);
  };

  // Get border color based on state
  const getBorderColor = () => {
    if (error) return theme.colors.error.main;
    if (isFocused) return theme.colors.primary.main;
    return theme.colors.divider;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemeText
          variant="manrope.subtitle2"
          color={error ? theme.colors.error.main : theme.colors.text.primary}
          style={styles.label}
        >
          {label}
        </ThemeText>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: theme.colors.inputBackground,
          },
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          inputContainerStyle,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              ...getManropeStyle(400, false),
            },
            style,
          ]}
          placeholderTextColor={theme.colors.text.hint}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...inputProps}
        />

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {(error ?? hint) && (
        <ThemeText
          variant="manrope.caption"
          color={error ? theme.colors.error.main : theme.colors.text.hint}
          style={styles.helperText}
        >
          {error ?? hint}
        </ThemeText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: verticalScale(16),
    width: "100%",
  },
  label: {
    marginBottom: verticalScale(4),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: scale(1),
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(12),
    height: verticalScale(48),
  },
  inputContainerFocused: {
    borderWidth: scale(2),
  },
  inputContainerError: {
    borderWidth: scale(2),
  },
  input: {
    flex: 1,
    height: "100%",
    padding: 0,
    fontSize: moderateScale(16),
  },
  leftIcon: {
    marginRight: scale(8),
  },
  rightIcon: {
    marginLeft: scale(8),
  },
  helperText: {
    marginTop: verticalScale(4),
    marginLeft: scale(4),
  },
});
