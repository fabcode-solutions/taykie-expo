import { Stack } from "expo-router";
import { useTheme } from "@/theme";
import { AlertProvider } from "@/provider/AlertProvider";

export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <AlertProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: theme.colors.background.default },
        }}
      >
        <Stack.Screen name="create-account" />
        <Stack.Screen name="country-language" />
        <Stack.Screen name="pair-device" />
        <Stack.Screen name="dosage-frequency" />
        <Stack.Screen name="supplement-entry" />
        <Stack.Screen name="other-supplements" />
        <Stack.Screen name="refill-reminder" />
        <Stack.Screen name="reminder-style" />
        <Stack.Screen name="lock-screen" />
        <Stack.Screen name="baseline-checkin" />
        <Stack.Screen name="coaching-optin" />
        <Stack.Screen name="all-set" options={{ animation: "fade", gestureEnabled: false }} />
      </Stack>
    </AlertProvider>
  );
}
