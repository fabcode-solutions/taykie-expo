import "../global.css";

import { DefaultTheme, ThemeProvider as ThemeProviderNative } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { ThemeProvider } from "@/theme";
import { ThemeStatusBar } from "@/components/primitives";

import i18n from "@/i18n";
import { I18nextProvider } from "react-i18next";
import { useLanguageStore } from "@/stores/languageStore";
import { setDateLocale } from "@/utils/date";

import { AlertProvider } from "@/provider/AlertProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/hooks/queries/queryClient";

import * as WebBrowser from "expo-web-browser";
import { Provider as PaperProvider, MD3LightTheme as PaperLightTheme } from "react-native-paper";

import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import {
  isNotificationSoundEnabled,
  NotificationType,
  useNotificationStore,
} from "@/stores/notificationStore";
import { InAppBanner } from "@/components/inAppBanner";
import { setupNotificationChannels } from "@/hooks/usePushNotifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // 1. Correctly extract the data from the notification object
    const data = notification.request.content.data;
    const type = data?.type as string | undefined;

    // 2. Use !! to force the result into a strict boolean (true/false)
    const soundEnabled = !!isNotificationSoundEnabled(type || "");

    const settings = useNotificationStore.getState().notificationSettings;
    const vibrationEnabled = !!(settings?.notifications?.vibration ?? false);
    const vibrationPattern = [0, 250, 250, 250];
    const isAndroid = Platform.OS === "android";
    return {
      shouldShowAlert: true,
      shouldPlaySound: isAndroid ? true : soundEnabled,
      shouldVibrate: isAndroid ? true : vibrationEnabled,
      vibrationPattern: isAndroid || vibrationEnabled ? vibrationPattern : undefined,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("🌙 Background message:", remoteMessage);
  await useNotificationStore.getState().fetchNotifications();
});
// Prevent splash auto hide
SplashScreen.preventAutoHideAsync();

// Complete OAuth session
WebBrowser.maybeCompleteAuthSession();

const FONTS = {
  "Manrope": require("../assets/fonts/Manrope/Manrope-VariableFont_wght.ttf"),
  "Manrope-Regular": require("../assets/fonts/Manrope/Manrope-Regular.ttf"),
  "Manrope-Medium": require("../assets/fonts/Manrope/Manrope-Medium.ttf"),
  "Manrope-SemiBold": require("../assets/fonts/Manrope/Manrope-SemiBold.ttf"),
  "Manrope-Bold": require("../assets/fonts/Manrope/Manrope-Bold.ttf"),
  "Manrope-Light": require("../assets/fonts/Manrope/Manrope-Light.ttf"),
  "Manrope-ExtraLight": require("../assets/fonts/Manrope/Manrope-ExtraLight.ttf"),
  "Manrope-ExtraBold": require("../assets/fonts/Manrope/Manrope-ExtraBold.ttf"),
  "GascogneSerial-Regular": require("../assets/fonts/GascogneSerial/Gascogne-Serial.ttf"),
};

const STACK_CONFIG = {
  screenOptions: { headerShown: false },
  screens: [
    { name: "index" },
    { name: "(onboarding)" },
    { name: "(auth)", redirect: (isAuthenticated: boolean) => isAuthenticated },
    { name: "(tabs)", redirect: (isAuthenticated: boolean) => !isAuthenticated },
    { name: "(screens)", redirect: (isAuthenticated: boolean) => !isAuthenticated },
    { name: "+not-found", options: { presentation: "modal" as const } },
  ],
};

function AppContent() {
  const [fontsLoaded] = useFonts(FONTS);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const selectedLanguage = useLanguageStore((s) => s.selectedLanguage);
  // Language handling
  useEffect(() => {
    const lng = selectedLanguage || "en-US";

    if (i18n.language !== lng) {
      i18n.changeLanguage(lng).catch(() => {});
    }

    try {
      setDateLocale(lng);
    } catch {}
  }, [selectedLanguage]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification;

      console.log("🔔 Notification clicked:", data);
      handleNotificationNavigation(data.type as NotificationType);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setupNotificationChannels();
  }, []);

  useEffect(() => {
    // App opened from background
    const unsubscribe = messaging().onNotificationOpenedApp(async (remoteMessage) => {
      await useNotificationStore.getState().fetchNotifications();
      console.log("📲 Opened from background:", remoteMessage);

      handleNotificationNavigation(remoteMessage?.data?.type as NotificationType);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      // App opened from quit state
      messaging()
        .getInitialNotification()
        .then(async (remoteMessage) => {
          if (remoteMessage) {
            await useNotificationStore.getState().fetchNotifications();
            console.log("🚀 Opened from quit:", remoteMessage);
            handleNotificationNavigation(remoteMessage?.data?.type as NotificationType);
          }
        });
    }, 1000); // wait for router to be ready

    return () => clearTimeout(timer);
  }, []);

  const handleNotificationNavigation = (notificationType: NotificationType) => {
    switch (notificationType) {
      case "Like":
        router.navigate("/(tabs)/community");
        // Navigate to chat screen with remoteMessage.data.conversationId
        break;
      case "Comment":
        router.push({
          pathname: "/(tabs)/community",
          params: {
            commentId: "Following",
          },
        });
        // Navigate to notifications screen
        break;
      case "Follow":
        router.navigate("/profile/follow");
        break;
      case "System":
      case "Group":
        break;
    }
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProviderNative value={DefaultTheme}>
        <PaperProvider theme={PaperLightTheme}>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <AlertProvider>
                  <ThemeStatusBar />
                  <Stack {...STACK_CONFIG}>
                    {STACK_CONFIG.screens.map((screen) => (
                      <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
                    ))}
                  </Stack>
                  <InAppBanner />
                </AlertProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </I18nextProvider>
        </PaperProvider>
      </ThemeProviderNative>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return <AppContent />;
}
