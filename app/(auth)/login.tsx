import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, Image, Platform, Keyboard } from "react-native";
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
import { Images } from "@/assets";
import { startGoogleNativeAndExchange, startAppleNativeAndExchange } from "@/services/api/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useOnboardingStore } from "@/stores/onboardingStore";
import zxcvbn from "zxcvbn";

interface LoginFormData {
  email: string;
  password: string;
}

function LoginScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const alert = useAlert();
  const { login, isLoading } = useAuthStore();
  const isIOS = Platform.OS === "ios";
  const { from } = useLocalSearchParams();

  const { control, handleSubmit, setFocus } = useForm<LoginFormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password,
      });
      const isOnboardingComplete = useOnboardingStore.getState().isOnboardingComplete;

      // The email/password inputs may still have focus (soft keyboard open)
      // when login resolves. Dismissing it and deferring the navigation lets
      // the keyboard's own close animation finish before the (auth)→(tabs)
      // stack replace mounts the whole tab navigator — doing both at once
      // has been implicated in a native Yoga/Fabric shadow-tree crash on
      // some Android devices (same class as the modal-transition crashes
      // fixed elsewhere in this app).
       if (isOnboardingComplete) {
        router.replace("/(tabs)");
      } else {
        router.push("/(onboarding)/country-language");
      }
    } catch (err) {
      alert.show(AlertPresets.error(t(LocalizedStrings.auth.authStart.requestFailed), err.message));
    }
  };

  const navigateToSignUp = () => {
    if (from === "signup") {
      router.back();
    } else {
      router.push({
        pathname: "/(auth)/signup",
        params: { from: "login" },
      });
    }
  };

  const navigateToForgetPassword = () => {
    router.push("/(auth)/forget-password");
  };

  const handleBack = () => {
    router.back();
  };

  const handleGoogleLogin = async () => {
    try {
      // Try native Google sign-in + exchange first; fallback to browser-based NextAuth
      await startGoogleNativeAndExchange();
      const isOnboardingComplete = useOnboardingStore.getState().isOnboardingComplete;

      if (isOnboardingComplete) {
        router.replace("/(tabs)");
      } else {
        router.push("/(onboarding)/country-language");
      }
    } catch (err) {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.auth.authStart.loginFailedTitle), err.message),
      );
    }
  };

  const handleAppleLogin = async () => {
    try {
      await startAppleNativeAndExchange();
      const isOnboardingComplete = useOnboardingStore.getState().isOnboardingComplete;

      if (isOnboardingComplete) {
        router.replace("/(tabs)");
      } else {
        router.push("/(onboarding)/country-language");
      }
    } catch (err) {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.auth.authStart.loginFailedTitle), err.message),
      );
    }
  };

  return (
    <AuthScreenLayout onBack={handleBack}>
      <ThemeView style={styles.buttom}>
        <ThemeText variant="gs.title" style={styles.title}>
          {t(LocalizedStrings.auth.login.title)}
        </ThemeText>
        <ThemeText variant="manrope.body1" style={styles.title}>
          {t(LocalizedStrings.auth.login.subtitle)}
        </ThemeText>
        <ThemeView style={styles.formContainer}>
          <Input
            control={control}
            name="email"
            rules={{
              required: t(LocalizedStrings.errors.validation.email.required),
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: t(LocalizedStrings.errors.validation.email.invalid),
              },
            }}
            placeholder={t(LocalizedStrings.auth.login.email)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            onSubmitEditing={() => setFocus("password")}
            returnKeyType="next"
          />
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
            placeholder={t(LocalizedStrings.auth.login.password)}
            secureTextEntry
            onSubmitEditing={handleSubmit(onSubmit)}
            returnKeyType="go"
          />
          <ThemeView style={styles.forgotPasswordContainer}>
            <TouchableOpacity onPress={navigateToForgetPassword}>
              <ThemeText variant="gs.link" style={styles.forgotPasswordText}>
                {t(LocalizedStrings.auth.login.forgotPassword)}
              </ThemeText>
            </TouchableOpacity>
          </ThemeView>

          <Button
            title={t(LocalizedStrings.auth.login.button)}
            onPress={handleSubmit(onSubmit)}
            rightIcon={null}
            loading={isLoading}
            disabled={isLoading}
          />
        </ThemeView>

        {/* Divider */}
        <ThemeView style={styles.dividerContainer}>
          <ThemeView style={styles.dividerLine} />
          <ThemeText style={styles.dividerText}>{t(LocalizedStrings.auth.authStart.or)}</ThemeText>
          <ThemeView style={styles.dividerLine} />
        </ThemeView>

        <ThemeView style={[{ gap: scale(10) }, isIOS && styles.socialButtonsRow]}>
          {/* Google Login */}
          <Button
            loading={isLoading}
            onPress={handleGoogleLogin}
            variant="outline"
            textStyle={styles.googleButtonText}
            title={
              isIOS
                ? t(LocalizedStrings.auth.authStart.social.google)
                : t(LocalizedStrings.auth.login.loginWithGoogle)
            }
            style={{ ...styles.googleButton, ...styles.socialButton }}
            leftIcon={
              <Image
                style={{
                  aspectRatio: 1,
                  height: verticalScale(20),
                }}
                source={Images.google_icon}
              />
            }
          />

          {/* Apple Login */}
          {isIOS && (
            <Button
              title={t(LocalizedStrings.auth.authStart.social.apple)}
              onPress={handleAppleLogin}
              style={{ ...styles.googleButton, ...styles.socialButton }}
              variant="outline"
              textStyle={styles.googleButtonText}
              loading={isLoading}
              leftIcon={
                <Ionicons
                  name="logo-apple"
                  size={moderateScale(24)}
                  color={theme.colors.text.primary}
                />
              }
            />
          )}
        </ThemeView>

        {/* Bottom sign up */}
        <ThemeView style={styles.signUpContainer}>
          <ThemeText
            variant="manrope.body"
            style={[
              styles.signUpText,
              {
                color: theme.colors.text.secondary,
              },
            ]}
          >
            {t(LocalizedStrings.auth.login.noAccount)}
          </ThemeText>
          <TouchableOpacity onPress={navigateToSignUp}>
            <ThemeText variant="manrope.body" style={styles.signUpLinkText}>
              {t(LocalizedStrings.auth.login.signUp)}
            </ThemeText>
          </TouchableOpacity>
        </ThemeView>
      </ThemeView>
    </AuthScreenLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      alignItems: "flex-start",
    },
    logoContainer: {
      marginBottom: verticalScale(24),
    },
    title: {
      textAlign: "left",
      marginBottom: verticalScale(8),
    },
    formContainer: {
      marginTop: verticalScale(30),
    },

    forgotPasswordContainer: {
      alignItems: "flex-end",
      marginBottom: verticalScale(24),
    },
    signUpContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: verticalScale(24),
      gap: scale(3),
    },
    buttom: {
      marginTop: verticalScale(10),
    },
    signUpText: {
      fontSize: moderateScale(16),
    },
    socialButtonsContainer: {
      width: "100%",
      gap: scale(12),
    },
    socialButtonsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    socialButton: {
      flex: 1,
    },
    appleButtonSpacing: {
      marginTop: verticalScale(12),
    },
    forgotPasswordText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(16),
      lineHeight: verticalScale(24),
    },
    signUpLinkText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(16),
      fontWeight: "600" as const,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginVertical: verticalScale(24),
      paddingHorizontal: scale(50),
      gap: scale(16),
    },
    dividerLine: {
      height: verticalScale(1),
      backgroundColor: theme.colors.divider,
      flex: 1,
    },
    dividerText: {
      color: theme.colors.text.secondary,
    },
    googleButton: {
      backgroundColor: theme.colors.white,
      minHeight: verticalScale(50),
      borderRadius: 999,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: scale(1),
      borderColor: theme.colors.border,
    },
    googleButtonText: {
      fontWeight: 500,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.manrope.brandBody.fontFamily,
    },
  });

export default LoginScreen;
