import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { SettingItem } from "@/data/settings";
import IconNotifications from "@/components/icons/settings/IconNotifications";
import IconForward from "@/components/icons/settings/IconForward";
import ActionItem from "@/components/settings/ActionItem";
import IconDevice from "@/components/icons/tabs/IconDevice";
import Switch from "@/components/ui/Switch";
import IconLock from "@/components/icons/settings/IconLock";
import NotificationBottomDrawer from "@/components/settings/NotificationBottomDrawer";
import IconVibration from "@/components/icons/settings/IconVibration";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { NotificationSettingsModel, useNotificationStore } from "@/stores/notificationStore";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

const IS_IOS = Platform.OS === "ios";

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const alert = useAlert();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { fetchNotificationSettings, updateNotificationSettings, notificationSettings } =
    useNotificationStore();
  const [notification, setNotification] = useState({
    appNotification: notificationSettings?.notifications?.appNotification ?? false,
    vibration: notificationSettings?.notifications?.vibration ?? false,
    showOnLockScreen: notificationSettings?.notifications?.showOnLockScreen ?? false,
  });
  const [notificationSoundIsOpen, setNotificationSoundIsOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      await fetchNotificationSettings();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  // Update notification state and call API (Android only for Vibration/LockScreen)
  const handleNotifications = useCallback(
    async (key: keyof typeof notification) => {
      setNotification((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));

      try {
        const requestBody: NotificationSettingsModel = {
          notifications: {
            [key]: !notification[key],
          },
        };
        await updateNotificationSettings(requestBody);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [notification, updateNotificationSettings, t],
  );

  const handleNotificationSoundClose = useCallback(() => {
    setNotificationSoundIsOpen((prev) => !prev);
  }, []);

  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  const openIOSSettings = () => {
    Alert.alert(
      t(LocalizedStrings.settings.notificationSettings.openSettings.title),
      t(LocalizedStrings.settings.notificationSettings.openSettings.description),
      [
        { text: t(LocalizedStrings.common.cancel), style: "cancel" },
        {
          text: t(LocalizedStrings.settings.notificationSettings.openSettings.title),
          onPress: () => Linking.openSettings(),
        },
      ],
    );
  };

  const NOTIFICATIONS: SettingItem[] = useMemo(
    () => [
      {
        leftIcon: <IconNotifications />,
        heading: "Notification Sound",
        action: "notificationSound",
        description: "Change How Notification Sound.",
        rightIcon: <IconForward />,
      },
      {
        leftIcon: <IconDevice stroke={theme.colors.slateCharcoal} />,
        heading: "App Notification",
        action: "appNotification",
        description: "Receive mobile app notifications.",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleNotifications("appNotification")}
            value={notification.appNotification}
          />
        ),
      },
      {
        leftIcon: <IconVibration />,
        heading: "Vibration",
        action: "vibration",
        description: "Vibrate device when a reminder is due.",
        // If iOS, show a forward arrow instead of a switch to indicate navigation
        rightIcon: IS_IOS ? (
          <IconForward />
        ) : (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleNotifications("vibration")}
            value={notification.vibration}
          />
        ),
      },
      {
        leftIcon: <IconLock />,
        heading: "Show on Lock Screen",
        action: "showOnLockScreen",
        description: "Display Product reminder on lock screen. ",
        // If iOS, show a forward arrow instead of a switch to indicate navigation
        rightIcon: IS_IOS ? (
          <IconForward />
        ) : (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleNotifications("showOnLockScreen")}
            value={notification.showOnLockScreen}
          />
        ),
      },
    ],
    [
      theme.colors.slateCharcoal,
      theme.colors.text.primary,
      styles.switch,
      notification.appNotification,
      notification.vibration,
      notification.showOnLockScreen,
      handleNotifications,
      t,
    ],
  );

  const handleSoundSelect = async (sound: string) => {
    await updateSettings({
      notifications: {
        notificationSound: sound,
      },
    });
    setNotificationSoundIsOpen(false);
  };

  const updateSettings = useCallback(async (requestBody: NotificationSettingsModel) => {
    try {
      const message = await updateNotificationSettings(requestBody);
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
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
            {t("settings.notificationSettings.title")}
          </ThemeText>
        </View>
        <View style={styles.section}>
          {NOTIFICATIONS.map((item, index) => (
            <ActionItem
              key={index}
              heading={t(`settings.notificationSettings.${item.action}.title`)}
              description={t(`settings.notificationSettings.${item.action}.description`)}
              leftIcon={item.leftIcon}
              rightIcon={item.rightIcon}
              onPress={() => {
                if (item.action === "notificationSound") {
                  setNotificationSoundIsOpen(true);
                } else if (
                  IS_IOS &&
                  (item.action === "vibration" || item.action === "showOnLockScreen")
                ) {
                  // Catch iOS taps on Vibration and Lock Screen to redirect to Settings
                  openIOSSettings();
                } else if (
                  !IS_IOS &&
                  (item.action === "vibration" ||
                    item.action === "showOnLockScreen" ||
                    item.action === "appNotification")
                ) {
                  // Optional: If you want clicking the *row* (not just the switch) to toggle the switch on Android
                  handleNotifications(item.action as keyof typeof notification);
                }
              }}
            />
          ))}
        </View>
      </ScrollView>
      <NotificationBottomDrawer
        selected={notificationSettings?.notifications?.notificationSound ?? "default"}
        isVisible={notificationSoundIsOpen}
        onClose={handleNotificationSoundClose}
        onSave={handleSoundSelect}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
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
      gap: verticalScale(14),
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
  });
