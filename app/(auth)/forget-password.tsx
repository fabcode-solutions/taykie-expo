import { ThemeText } from "@/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/TextInput/input";
import { useAlert } from "@/provider/AlertProvider";
import { useTheme } from "@/theme";
import { AlertPresets } from "@/utils/alert";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { TextStyle, ViewStyle } from "react-native";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface ForgetPasswordForm {
  email: string;
}

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const alert = useAlert();
  const router = useRouter();
  const { forgotPassword, isLoading } = useAuthStore();

  const { control, handleSubmit } = useForm<ForgetPasswordForm>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgetPasswordForm) => {
    try {
      await forgotPassword(data.email);
      router.push({
        pathname: "/(auth)/password-reset",
        params: { email: data.email },
      });
    } catch (err) {
      alert.show(AlertPresets.error(t(LocalizedStrings.auth.authStart.requestFailed), err.message));
    }
  };

  const dynamicStyles: {
    title: TextStyle;
    subtitle: TextStyle;
    input: ViewStyle;
  } = {
    title: {
      color: theme.colors.text.primary,
      marginBottom: verticalScale(6),
    },
    subtitle: {
      color: theme.colors.text.secondary,
      marginBottom: verticalScale(32),
    },
    input: {
      marginBottom: verticalScale(24),
    },
  };

  return (
    <AuthScreenLayout onBack={() => router.back()} headerBottomSpacing={32}>
      <ThemeText variant="gs.h2" style={dynamicStyles.title}>
        {t(LocalizedStrings.auth.forgetpassword.title)}
      </ThemeText>
      <ThemeText variant="manrope.subtitle" style={dynamicStyles.subtitle}>
        {t(LocalizedStrings.auth.forgetpassword.subtitle)}
      </ThemeText>

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
        placeholder={t(LocalizedStrings.auth.forgetpassword.email)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={dynamicStyles.input}
        onSubmitEditing={handleSubmit(onSubmit)}
        returnKeyType="send"
      />

      <Button
        title={t(LocalizedStrings.auth.forgetpassword.button)}
        onPress={handleSubmit(onSubmit)}
        rightIcon={null}
        loading={isLoading}
        disabled={isLoading}
      />
    </AuthScreenLayout>
  );
}
