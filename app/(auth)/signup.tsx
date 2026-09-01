import React from "react";
import {
  StyleSheet,
  Platform,
  Image,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { Theme, useTheme } from "@/theme";
import { useAuthStore } from "@/stores/authStore";
import { ThemeText, ThemeView } from "@/components";
import { Input } from "@/components/ui/TextInput/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAlert } from "@/provider/AlertProvider";
import zxcvbn from "zxcvbn";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import {
  RegisterRequest,
  startAppleNativeAndExchange,
  startGoogleNativeAndExchange,
} from "@/services/api/auth";
import { AlertPresets } from "@/utils/alert";
import { Images } from "@/assets";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@/components/BackButton";

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

function SignUpScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const alert = useAlert();
  const { register, isLoading } = useAuthStore();
  const {
    control,
    register: registerField,
    handleSubmit,
    setFocus,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  const { acceptedTerms } = watch();
  const isIOS = Platform.OS === "ios";
  const { from } = useLocalSearchParams();

  React.useEffect(() => {
    registerField("acceptedTerms", {
      validate: (value) => value || "You must accept Terms & Privacy Policy",
    });
  }, [registerField]);

  const navigateToLogin = () => {
    if (from === "login") {
      router.back();
    } else {
      router.push({
        pathname: "/(auth)/login",
        params: { from: "signup" },
      });
    }
  };
  const onSubmit = async (data: SignUpFormData) => {
    // Compose payload for Register API
    try {
      const nameParts = data.name?.trim().split(" ").filter(Boolean) || [];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const payload: RegisterRequest = {
        email: data.email,
        password: data.password,
        accepted_terms: acceptedTerms,
      };

      if (firstName) payload.firstName = firstName;
      if (lastName) payload.lastName = lastName;
      const message = await register(payload);
      router.push("/(onboarding)/country-language");
      alert.show(AlertPresets.success(message));
    } catch (err) {
      alert.show(AlertPresets.error(err.message));
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleGoogleSignUp = async () => {
    try {
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

  const handleAppleSignup = async () => {
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

  const dynamicStyles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <KeyboardAvoidingView
      style={[dynamicStyles.safeArea, { backgroundColor: theme.colors.background.default }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <SafeAreaView>
        <View style={{ paddingHorizontal: scale(20), paddingTop: verticalScale(30) }}>
          <BackButton />
        </View>

        <ScrollView
          style={dynamicStyles.container}
          contentContainerStyle={dynamicStyles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <ThemeText variant="gs.h2" style={dynamicStyles.title}>
            {t(LocalizedStrings.auth.signup.title)}
          </ThemeText>

          <ThemeView style={dynamicStyles.formContainer}>
            <Input
              control={control}
              name="name"
              rules={{
                required: t(LocalizedStrings.errors.validation.name.required),
                minLength: {
                  value: 2,
                  message: t(LocalizedStrings.errors.validation.minLength, { count: 2 }),
                },
                maxLength: {
                  value: 50,
                  message: t(LocalizedStrings.errors.validation.maxLength, { count: 50 }),
                },
                pattern: {
                  value: /^[A-Za-z\s]+$/,
                  message: t(LocalizedStrings.errors.validation.name.invalid),
                },
              }}
              placeholder={t(LocalizedStrings.auth.signup.name)}
              autoCapitalize="words"
              onSubmitEditing={() => setFocus("email")}
              returnKeyType="next"
              textContentType="name"
              autoComplete="name"
            />
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
              placeholder={t(LocalizedStrings.auth.signup.email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              onSubmitEditing={() => setFocus("password")}
              returnKeyType="next"
              textContentType="username"
              autoComplete="username"
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
              placeholder={t(LocalizedStrings.auth.signup.password)}
              secureTextEntry
              onSubmitEditing={() => setFocus("confirmPassword")}
              returnKeyType="next"
              textContentType="oneTimeCode"
              autoComplete="off"
            />

            <Input
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
              placeholder={t(LocalizedStrings.auth.signup.confirmPassword)}
              secureTextEntry
              onSubmitEditing={handleSubmit(onSubmit)}
              returnKeyType="done"
              textContentType="oneTimeCode"
              autoComplete="off"
            />

            <View style={{ marginTop: verticalScale(10), marginBottom: verticalScale(20) }}>
              <View style={dynamicStyles.checkboxRow}>
                <TouchableOpacity
                  style={[
                    dynamicStyles.checkBox,
                    {
                      borderColor: acceptedTerms ? theme.colors.black : theme.colors.border,
                      backgroundColor: acceptedTerms ? theme.colors.primary.main : "transparent",
                    },
                  ]}
                  onPress={() => setValue("acceptedTerms", !acceptedTerms)}
                >
                  <Ionicons
                    name={"checkmark-outline"}
                    size={moderateScale(20)}
                    color={acceptedTerms ? theme.colors.slateCharcoal : "transparent"}
                  />
                </TouchableOpacity>

                <ThemeText style={dynamicStyles.termsText}>
                  I agree to the{" "}
                  <ThemeText
                    style={dynamicStyles.link}
                    onPress={() => router.push("/(auth)/terms-and-conditions")}
                  >
                    Terms
                  </ThemeText>{" "}
                  and{" "}
                  <ThemeText
                    style={dynamicStyles.link}
                    onPress={() => router.push("/(auth)/privacy-policy")}
                  >
                    Privacy Policy
                  </ThemeText>
                </ThemeText>
              </View>
              {errors.acceptedTerms && (
                <ThemeText style={{ color: theme.colors.error.main, fontSize: 12 }}>
                  {errors.acceptedTerms.message}
                </ThemeText>
              )}
            </View>

            <Button
              title={t(LocalizedStrings.auth.signup.button)}
              onPress={handleSubmit(onSubmit)}
              style={dynamicStyles.signUpButton}
              rightIcon={null}
              loading={isLoading}
              disabled={isLoading}
            />
          </ThemeView>
          {/* Divider */}
          <ThemeView style={dynamicStyles.dividerContainer}>
            <ThemeView style={dynamicStyles.dividerLine} />
            <ThemeText style={dynamicStyles.dividerText}>
              {t(LocalizedStrings.auth.authStart.or)}
            </ThemeText>
            <ThemeView style={dynamicStyles.dividerLine} />
          </ThemeView>

          <ThemeView style={[{ gap: scale(10) }, isIOS && dynamicStyles.socialButtonsRow]}>
            <Button
              onPress={handleGoogleSignUp}
              variant="outline"
              loading={isLoading}
              textStyle={dynamicStyles.googleButtonText}
              title={
                isIOS
                  ? t(LocalizedStrings.auth.authStart.social.google)
                  : t(LocalizedStrings.auth.login.signUpWithGoogle)
              }
              style={{ ...dynamicStyles.googleButton, ...dynamicStyles.socialButton }}
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

            {isIOS && (
              <Button
                title={t(LocalizedStrings.auth.authStart.social.apple)}
                onPress={handleAppleSignup}
                loading={isLoading}
                style={{ ...dynamicStyles.googleButton, ...dynamicStyles.socialButton }}
                variant="outline"
                textStyle={dynamicStyles.googleButtonText}
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

          <ThemeView style={dynamicStyles.signUpContainer}>
            <ThemeText
              variant="manrope.body"
              style={[
                {
                  color: theme.colors.text.secondary,
                },
              ]}
            >
              {t(LocalizedStrings.auth.signup.hasAccount)}
            </ThemeText>
            <TouchableOpacity onPress={navigateToLogin}>
              <ThemeText variant="manrope.body">{t(LocalizedStrings.auth.login.button)}</ThemeText>
            </TouchableOpacity>
          </ThemeView>
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
      paddingHorizontal: verticalScale(20),
      paddingTop: verticalScale(30),
    },
    contentContainer: {
      paddingBottom: verticalScale(80),
    },
    title: {
      textAlign: "left",
    },
    formContainer: {
      marginTop: verticalScale(20),
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
    signUpButton: {
      height: verticalScale(60),
      marginTop: verticalScale(10),
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
      height: 1,
      backgroundColor: theme.colors.divider,
      flex: 1,
    },
    dividerText: {
      color: theme.colors.text.secondary,
    },
    googleButton: {
      backgroundColor: theme.colors.white,
      minHeight: verticalScale(48),
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
    signUpContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: verticalScale(24),
      gap: scale(3),
    },

    termsText: {
      fontSize: moderateScale(14),
      color: theme.colors.text.secondary,
      textAlign: "center",
    },

    link: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      textDecorationLine: "underline",
    },

    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
    },

    checkBox: {
      borderWidth: 1,
      alignItems: "center",
      borderRadius: moderateScale(3),
    },
  });

export default SignUpScreen;
