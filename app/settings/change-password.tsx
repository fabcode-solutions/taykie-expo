import { StyleSheet, TouchableOpacity, View, ScrollView, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Input } from "@/components/ui/TextInput/input";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { ChangePasswordRequest } from "@/services/api/auth";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import zxcvbn from "zxcvbn";

interface FormData {
  oldPassword: string;
  password: string;
  confirmPassword: string;
}

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const { changePassword, isLoading } = useAuthStore();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const { control, handleSubmit, getValues } = useForm<FormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      oldPassword: "",
      password: "",
      confirmPassword: "",
    },
  });
  const onSubmit = async (data: FormData) => {
    try {
      const request: ChangePasswordRequest = {
        currentPassword: data.oldPassword,
        newPassword: data.password,
      };
      const message = await changePassword(request);
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      router.replace("/(tabs)");
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };
  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
    >
      <SafeAreaView>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: verticalScale(80) }}
        >
          <View>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <View style={styles.backButtonInner}>
                <IconBackArrow />
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.headerRow]}>
            <ThemeText variant="manrope.h2" style={styles.header}>
              {t(LocalizedStrings.settings.changePassword.title)}
            </ThemeText>
          </View>
          <View style={styles.section}>
            <Input
              label={t(LocalizedStrings.settings.changePassword.oldPassword)}
              control={control}
              name="oldPassword"
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
                      return "Old Password must contain at least 8 characters, uppercase, lowercase, number and special character";
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
              placeholder={t(LocalizedStrings.settings.changePassword.placeholder.oldPassword)}
              secureTextEntry
              onSubmitEditing={handleSubmit(onSubmit)}
              returnKeyType="next"
            />
            <Input
              label={t(LocalizedStrings.settings.changePassword.newPassword)}
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
              placeholder={t(LocalizedStrings.settings.changePassword.placeholder.newPassword)}
              secureTextEntry
              onSubmitEditing={handleSubmit(onSubmit)}
              returnKeyType="next"
            />
            <Input
              label={t(LocalizedStrings.settings.changePassword.confirmNewPassword)}
              control={control}
              name="confirmPassword"
              rules={{
                required: t(LocalizedStrings.errors.validation.confirmPassword.required),
                validate: (value: string) => {
                  const password = getValues("password");
                  return (
                    value === password ||
                    t(LocalizedStrings.errors.validation.confirmPassword.mismatch)
                  );
                },
              }}
              placeholder={t(
                LocalizedStrings.settings.changePassword.placeholder.confirmNewPassword,
              )}
              secureTextEntry
              onSubmitEditing={handleSubmit(onSubmit)}
              returnKeyType="go"
            />
          </View>
          <Button
            title={t(LocalizedStrings.settings.changePassword.title)}
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
    },
    backButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.primary.main,
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonInner: {
      aspectRatio: 1,
      height: verticalScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    section: {
      marginTop: verticalScale(20),
    },
    switch: {
      width: scale(30),
      height: verticalScale(6),
    },
    inputLabel: {
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
      marginBottom: verticalScale(6),
    },
  });
