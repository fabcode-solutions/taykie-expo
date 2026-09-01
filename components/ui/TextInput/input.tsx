import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  KeyboardTypeOptions,
  TextInputProps,
  TextStyle,
} from "react-native";
import { Controller, Control, FieldValues, Path, RegisterOptions } from "react-hook-form";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme, type Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { useTranslation } from "react-i18next";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface InputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  rules?: RegisterOptions<T>;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  icon?: React.ReactNode;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  spellCheck?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "go" | "next" | "search" | "send" | "default";
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  inputStyle?: TextStyle;
  editable?: boolean;
}

// Reusable Input Component
export const Input = <T extends FieldValues>({
  control,
  name,
  rules = {},
  placeholder,
  label,
  secureTextEntry = false,
  keyboardType = "default",
  icon,
  autoCapitalize = "none",
  autoCorrect = false,
  spellCheck = false,
  multiline = false,
  numberOfLines = 1,
  style,
  onSubmitEditing,
  returnKeyType = "default",
  autoComplete,
  textContentType,
  inputStyle,
  editable = true,
}: InputProps<T>) => {
  const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur, ref }, fieldState: { error } }) => (
        <View style={[styles.inputWrapper, style]}>
          {label && <ThemeText style={styles.inputLabel}>{t(label)}</ThemeText>}
          <View style={styles.inputContainer}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder ? t(placeholder) : undefined}
              secureTextEntry={secureTextEntry && !isSecureTextVisible}
              style={[
                styles.input,
                error ? styles.inputError : undefined,
                icon ? styles.inputWithIcon : undefined,
                secureTextEntry ? styles.inputWithSecureToggle : undefined,
                multiline ? styles.multilineInput : undefined,
                inputStyle,
                {
                  backgroundColor: editable ? theme.colors.inputBackground : theme.colors.gray[200],
                },
              ]}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              spellCheck={spellCheck}
              placeholderTextColor={theme.colors.text.hint}
              multiline={multiline}
              numberOfLines={multiline ? numberOfLines : 1}
              textAlignVertical={multiline ? "top" : "center"}
              onSubmitEditing={onSubmitEditing}
              returnKeyType={returnKeyType}
              autoComplete={autoComplete}
              textContentType={textContentType}
              editable={editable}
            />
            {secureTextEntry && (
              <TouchableOpacity
                style={styles.secureTextToggle}
                onPress={() => setIsSecureTextVisible(!isSecureTextVisible)}
                accessibilityLabel={
                  isSecureTextVisible
                    ? t(LocalizedStrings.auth.hidePassword)
                    : t(LocalizedStrings.auth.showPassword)
                }
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isSecureTextVisible ? "eye-off-outline" : "eye-outline"}
                  size={moderateScale(20)}
                  color={theme.colors.icon}
                />
              </TouchableOpacity>
            )}
          </View>
          {error && <Text style={styles.errorText}>{t(`${error.message}`)}</Text>}
        </View>
      )}
    />
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    inputWrapper: { marginBottom: verticalScale(16), width: "100%" },
    inputLabel: {
      fontSize: moderateScale(14),
      marginBottom: verticalScale(8),
      color: theme.colors.text.primary,
      fontWeight: "500",
    },
    inputContainer: { position: "relative", width: "100%" },
    input: {
      height: verticalScale(60),
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(16),
      fontSize: moderateScale(12),
      fontFamily: theme.typography.manrope.body2.fontFamily,
      color: theme.colors.text.primary,
    },
    multilineInput: {
      height: verticalScale(120),
      paddingTop: verticalScale(12),
      paddingBottom: verticalScale(12),
      textAlignVertical: "top",
    },
    inputWithIcon: { paddingLeft: scale(48) },
    inputWithSecureToggle: { paddingRight: scale(48) },
    inputError: { borderColor: theme.colors.error.main },
    iconContainer: {
      position: "absolute",
      left: scale(16),
      top: "50%",
      transform: [{ translateY: -12 }],
      zIndex: 1,
    },
    secureTextToggle: {
      position: "absolute",
      right: scale(12),
      top: "50%",
      transform: [{ translateY: -16 }],
      zIndex: 1,
      aspectRatio: 1,
      height: verticalScale(32),
      justifyContent: "center",
      alignItems: "center",
      borderRadius: moderateScale(16),
    },
    errorText: {
      color: theme.colors.error.main,
      fontSize: moderateScale(12),
      fontFamily: theme.typography.manrope.caption.fontFamily,
      marginTop: verticalScale(4),
      marginLeft: scale(4),
    },
  });
