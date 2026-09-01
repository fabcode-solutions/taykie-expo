import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { usePassTranslationsToNative } from "@/utils/hooks";

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnboardingComplete = useOnboardingStore((s) => s.isOnboardingComplete);

  usePassTranslationsToNative();
  // Authenticated + onboarding complete → main app
  if (isAuthenticated && isOnboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  // Authenticated but onboarding not finished → resume onboarding
  if (isAuthenticated && !isOnboardingComplete) {
    return <Redirect href="/(auth)/welcome-screen" />;
  }

  // Not authenticated → start onboarding flow
  return <Redirect href="/(auth)/welcome-screen" />;
}
