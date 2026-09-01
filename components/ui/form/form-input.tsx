import React, { useMemo } from "react";
import { View, TextInput, StyleSheet, KeyboardTypeOptions } from "react-native";
import { Control, Controller, FieldValues, Path, RegisterOptions } from "react-hook-form";
import { useTheme, type Theme } from "@/theme";
import { ThemeText, ThemeView } from "@/components/primitives";
import { useTranslation } from "react-i18next";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

interface FormInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  rules?: RegisterOptions<T>;
  placeholder?: string;
  secureTextEntry?: boolean;
  icon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  spellCheck?: boolean;
}

/**
 * A reusable form input component that integrates with react-hook-form
 * and supports icons, validation, and theming.
 */
export const FormInput = <T extends FieldValues>({
  control,
  name,
  rules = {},
  placeholder,
  secureTextEntry = false,
  icon,
  keyboardType = "default",
  autoCapitalize = "none",
  autoCorrect = false,
  spellCheck = false,
}: FormInputProps<T>) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <ThemeView style={styles.inputContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            style={[styles.input, error && styles.inputError]}
            keyboardType={keyboardType}
            placeholderTextColor={theme.colors.text.hint}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            spellCheck={spellCheck}
          />
          {error && <ThemeText style={styles.errorText}>{t(`errors.${error.message}`)}</ThemeText>}
        </ThemeView>
      )}
    />
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    keyboardAvoidingContainer: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: scale(24),
      paddingTop: verticalScale(40),
      paddingBottom: verticalScale(24),
    },
    header: {
      alignItems: "center",
      marginBottom: verticalScale(40),
    },
    logoContainer: {
      marginBottom: verticalScale(24),
    },
    logoCircle: {
      aspectRatio: 1,
      height: verticalScale(80),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      padding: verticalScale(15),
    },
    logoHeart: {
      aspectRatio: 1,
      height: verticalScale(30),
      backgroundColor: theme.colors.primary.light,
      borderRadius: 999,
    },
    title: {
      fontSize: moderateScale(28),
      fontWeight: "bold",
      color: theme.colors.text.primary,
      marginBottom: verticalScale(8),
    },
    subtitle: {
      fontSize: moderateScale(16),
      color: theme.colors.text.disabled,
      marginBottom: verticalScale(16),
    },
    formContainer: {
      width: "100%",
      marginBottom: verticalScale(24),
    },
    inputContainer: {
      marginBottom: verticalScale(20),
    },
    iconContainer: {
      position: "absolute",
      left: scale(12),
      top: verticalScale(15),
      zIndex: 1,
    },
    input: {
      height: verticalScale(56),
      borderWidth: scale(1),
      borderRadius: moderateScale(12),
      paddingHorizontal: scale(45),
      fontSize: moderateScale(16),
      borderColor: theme.colors.divider,
      color: theme.colors.text.primary,
    },
    inputError: {
      borderColor: theme.colors.error.main,
    },
    errorText: {
      fontSize: moderateScale(12),
      marginTop: verticalScale(4),
      marginLeft: scale(12),
      color: theme.colors.error.main,
    },
    forgotPasswordContainer: {
      alignSelf: "flex-end",
      marginBottom: verticalScale(24),
    },
    forgotPasswordText: {
      color: theme.colors.primary.main,
      fontSize: moderateScale(14),
    },
    signInButton: {
      backgroundColor: theme.colors.primary.main,
      height: verticalScale(56),
      borderRadius: 999,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.colors.primary.main,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(4),
      elevation: 5,
    },
    signInButtonText: {
      color: theme.colors.primary.contrast,
      fontSize: moderateScale(18),
      fontWeight: "600",
    },
    signUpContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: verticalScale(24),
    },
    signUpText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(16),
    },
    signUpLinkText: {
      color: theme.colors.primary.main,
      fontSize: moderateScale(16),
      fontWeight: "600",
    },
  });
