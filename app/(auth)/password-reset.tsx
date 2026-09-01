import { ThemeText } from "@/components";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput, View, TouchableOpacity, TextStyle, ViewStyle } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function PasswordReset() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const theme = useTheme();
  const { t } = useTranslation();
  const CODE_LENGTH = 5;
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>("");
  const { verifyResetCode, isLoading } = useAuthStore();
  const alert = useAlert();

  const handleCodeChange = (text: string, index: number) => {
    const sanitized = text.replace(/\D/g, "");
    if (sanitized.length > 1) return;

    const newCode = [...code];
    newCode[index] = sanitized;
    setCode(newCode);

    if (error) setError(null); // Clear error on input change

    // Move to next input if value is entered
    if (sanitized && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input if backspace is pressed
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onSubmit = async () => {
    if (code.some((digit) => digit === "")) {
      setError("Please enter all digits of the code.");
      return;
    }
    try {
      const joined = code.join("");
      await verifyResetCode({ email, code: joined });
      router.push({ pathname: "/(auth)/new-password", params: { email, otp: joined } });
    } catch (err) {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.auth.passwordreset.invalidCode), err.message),
      );
    }
  };

  const handleResendOtp = async () => {
    try {
      const { forgotPassword } = useAuthStore.getState();
      await forgotPassword(email);
    } catch (error) {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.auth.authStart.requestFailed), error.message),
      );
    }
  };

  const dynamicStyles: {
    title: TextStyle;
    subtitle: TextStyle;
    codeContainer: ViewStyle;
    codeInput: TextStyle;
    codeInputFocused: TextStyle;
    errorText: TextStyle;
    resendContainer: ViewStyle;
    resendLink: TextStyle;
  } = {
    title: {
      color: theme.colors.primary.dark,
    },
    subtitle: {
      color: theme.colors.primary.dark,
      marginBottom: verticalScale(20),
    },
    codeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: verticalScale(12),
    },
    codeInput: {
      aspectRatio: 1,
      height: verticalScale(60),
      fontWeight: "700" as const,
      backgroundColor: theme.colors.background.elevated,
      borderRadius: moderateScale(10),
      fontSize: moderateScale(32),
      fontFamily: theme.typography.manrope.h3.fontFamily,
      textAlign: "center",
      color: theme.colors.text.primary,
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
    },
    codeInputFocused: {
      borderColor: theme.colors.primary.dark,
    },
    errorText: {
      color: theme.colors.error.main,
      fontSize: moderateScale(14),
      marginTop: -verticalScale(10),
      textAlign: "center",
    },
    resendContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    resendLink: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(16),
      fontFamily: theme.typography.gs.h2.fontFamily,
      fontWeight: "600" as const,
      marginBottom: verticalScale(16),
    },
  };

  return (
    <AuthScreenLayout onBack={() => router.back()} headerBottomSpacing={verticalScale(32)}>
      <ThemeText variant="gs.h2" style={dynamicStyles.title}>
        {t(LocalizedStrings.auth.passwordreset.title)}
      </ThemeText>
      <ThemeText variant="manrope.subtitle" style={dynamicStyles.subtitle}>
        {t(LocalizedStrings.auth.passwordreset.subtitle)}
      </ThemeText>

      <View style={dynamicStyles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputs.current[index] = ref;
            }}
            style={[
              dynamicStyles.codeInput,
              digit || focusedIndex === index ? dynamicStyles.codeInputFocused : null,
            ]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex((prev) => (prev === index ? null : prev))}
            returnKeyType={index === CODE_LENGTH - 1 ? "done" : "next"}
          />
        ))}
      </View>
      {error ? <ThemeText style={dynamicStyles.errorText}>{error}</ThemeText> : null}

      <View style={dynamicStyles.resendContainer}>
        <TouchableOpacity onPress={handleResendOtp}>
          <ThemeText style={dynamicStyles.resendLink}>
            {t(LocalizedStrings.auth.passwordreset.resend)}
          </ThemeText>
        </TouchableOpacity>
      </View>
      <Button
        title={t(LocalizedStrings.auth.passwordreset.button)}
        onPress={onSubmit}
        size="large"
        loading={isLoading}
        disabled={isLoading || code.includes("")}
      />
    </AuthScreenLayout>
  );
}
