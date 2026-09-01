import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { Theme, useTheme } from "@/theme";
import { useAuthStore } from "@/stores/authStore";
import { ThemeText, ThemeView } from "@/components";
import { Input } from "@/components/ui/TextInput/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import zxcvbn from "zxcvbn";

interface LoginFormData {
  password: string;
  confirmpassword: string;
}

function NewPasswordScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const alert = useAlert();
  const { resetPassword, isLoading, resetToken } = useAuthStore();
  const { email } = useLocalSearchParams<{
    token?: string;
    email?: string;
    otp?: string;
  }>();
  const { control, handleSubmit, getValues, setFocus } = useForm<LoginFormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      password: "",
      confirmpassword: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      if (email) {
        const message = await resetPassword({ email, otp: resetToken, password: data.password });
        alert.show(AlertPresets.success(t(LocalizedStrings.auth.newpassword.title), message));
        router.replace("/(auth)/login");
      }
    } catch (err) {
      alert.show(AlertPresets.error(t(LocalizedStrings.auth.authStart.requestFailed), err.message));
    }
  };

  const handleBack = () => router.back();

  const dynamicStyles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AuthScreenLayout onBack={handleBack} headerBottomSpacing={32}>
      <ThemeView>
        <ThemeText variant="gs.h2" style={dynamicStyles.title}>
          {t(LocalizedStrings.auth.newpassword.title)}
        </ThemeText>
        <ThemeText variant="manrope.subtitle" style={dynamicStyles.subtitle}>
          {t(LocalizedStrings.auth.newpassword.subtitle)}
        </ThemeText>
      </ThemeView>

      <ThemeView style={dynamicStyles.formContainer}>
        <Input
          control={control}
          name="password"
          rules={{
            required: t(LocalizedStrings.errors.validation.password.required),
            validate: (value: string) => {
              if (!value) {
                return t(LocalizedStrings.errors.validation.password.required);
              }

              const hasMinLength = value.length >= 8;
              const hasUpper = /[A-Z]/.test(value);
              const hasLower = /[a-z]/.test(value);
              const hasNumber = /[0-9]/.test(value);
              const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

              const allValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

              if (!allValid) {
                // 👇 Show generic message FIRST
                if (value.length < 8) {
                  return "Password must contain at least 8 characters, uppercase, lowercase, number and special character";
                }

                // 👇 After length is satisfied → show specific errors
                if (!hasUpper) return "Must include at least one uppercase letter";
                if (!hasLower) return "Must include at least one lowercase letter";
                if (!hasNumber) return "Must include at least one number";
                if (!hasSpecial) return "Must include a special character";
              }

              // ✅ Optional: strength check
              const result = zxcvbn(value);
              if (result.score < 2) {
                return (
                  result.feedback.warning || t(LocalizedStrings.errors.validation.password.weak)
                );
              }

              return true;
            },
          }}
          placeholder={t(LocalizedStrings.auth.newpassword.password)}
          secureTextEntry
          onSubmitEditing={() => setFocus("confirmpassword")}
          returnKeyType="next"
        />

        <Input
          control={control}
          name="confirmpassword"
          rules={{
            required: t(LocalizedStrings.errors.validation.confirmPassword.required),
            validate: (value: string) => {
              const password = getValues("password");
              return (
                value === password || t(LocalizedStrings.errors.validation.confirmPassword.mismatch)
              );
            },
          }}
          placeholder={t(LocalizedStrings.auth.newpassword.confirmPassword)}
          secureTextEntry
          onSubmitEditing={handleSubmit(onSubmit)}
          returnKeyType="go"
        />

        <Button
          title={t(LocalizedStrings.auth.newpassword.button)}
          onPress={handleSubmit(onSubmit)}
          style={dynamicStyles.signInButton}
          rightIcon={null}
          loading={isLoading}
          disabled={isLoading}
        />
      </ThemeView>

      {/* Bottom helper text removed to match mockup */}
    </AuthScreenLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      textAlign: "left",
      marginBottom: verticalScale(8),
    },
    formContainer: {
      marginTop: verticalScale(30),
    },
    subtitle: {
      fontWeight: "400" as const,
      color: theme.colors.text.disabled,
    },
    signInButton: {
      backgroundColor: theme.colors.primary.main,
      height: verticalScale(60),
      marginTop: verticalScale(8),
    },
  });

export default NewPasswordScreen;
