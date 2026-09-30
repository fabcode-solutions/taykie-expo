import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";
import { AlertProvider } from "@/provider/AlertProvider";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function AuthLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <AlertProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: t(LocalizedStrings.navigation.back),
          headerStyle: {
            backgroundColor: theme.colors.background.paper,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="welcome-screen"
          options={{
            title: t(LocalizedStrings.navigation.screens.welcome),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth-start"
          options={{
            title: t(LocalizedStrings.navigation.screens.authStart),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            title: t(LocalizedStrings.navigation.screens.createAccount),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: t(LocalizedStrings.navigation.screens.signIn),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="forget-password"
          options={{
            title: t(LocalizedStrings.navigation.screens.forgetPassword),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="password-reset"
          options={{
            title: t(LocalizedStrings.navigation.screens.passwordReset),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="new-password"
          options={{
            title: t(LocalizedStrings.navigation.screens.passwordReset),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="terms-and-conditions"
          options={{
            title: t(LocalizedStrings.navigation.screens.termsAndConditions),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="privacy-policy"
          options={{
            title: t(LocalizedStrings.navigation.screens.privacyPolicy),
            headerShown: false,
          }}
        />
      </Stack>
    </AlertProvider>
  );
}
