import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ActivityIndicator } from "react-native";
import { ThemeText, ThemeView } from "@/components";
import { useTheme } from "@/theme";
import { useAuthStore } from "@/stores/authStore";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { verticalScale } from "@/utils/scale";

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  // const syncContext = useContext(SyncContext);
  const { deleteAccount } = useAuthStore();
  const hasStarted = useRef(false);

  useEffect(() => {
    // Prevent running multiple times
    if (hasStarted.current) {
      return;
    }

    const performDelete = async () => {
      hasStarted.current = true;

      try {
        // Auth store handles everything: API call, sync stopping, storage clearing, database reset
        // await deleteAccount(syncContext?.syncEngine);

        // Navigate to signup
        router.replace("/(auth)/signup");
      } catch (error) {
        console.error("Delete account error:", error);
        // On error, go back to login
        router.replace("/(auth)/login");
      }
    };

    performDelete();
  }, [deleteAccount, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.default }}>
      <ThemeView style={{ flex: 1, justifyContent: "center", alignItems: "center" }} padded="lg">
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <ThemeText style={{ marginTop: verticalScale(16), textAlign: "center" }}>
          {t(LocalizedStrings.settings.deletingAccount)}
        </ThemeText>
      </ThemeView>
    </SafeAreaView>
  );
}
