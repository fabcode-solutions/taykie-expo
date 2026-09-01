import { StyleSheet, TouchableOpacity, View, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { SettingItem } from "@/data/settings";
import ActionItem from "@/components/settings/ActionItem";
import Switch from "@/components/ui/Switch";
import IconNotifications from "@/components/icons/settings/IconNotifications";
import SnoozeDuration from "@/components/settings/SnoozeDuration";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { NotificationSettingsModel, useNotificationStore } from "@/stores/notificationStore";
import { Loader } from "@/components/shared/loader";
import IconClock from "@/components/icons/settings/IconClock";
import IconInformation from "@/components/icons/IconInformation";
import IconTorch from "@/components/icons/settings/IconTorch";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function ReminderSettingsScreen() {
  const { t } = useTranslation();
  const alert = useAlert();
  const theme = useTheme();
  const router = useRouter();
  const { fetchNotificationSettings, updateNotificationSettings, notificationSettings, isLoading } =
    useNotificationStore();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reminder, setreminder] = useState({
    snoozeDuration: notificationSettings?.reminders?.snoozeDuration ?? "5 min",
    earlyReminderAlert: notificationSettings?.reminders?.earlyReminderAlert ?? false,
    missedDoseNotifications: notificationSettings?.reminders?.missedDoseNotifications ?? false,
    reminderLight: notificationSettings?.reminders?.reminderLight ?? false,
    reminderSound: notificationSettings?.reminders?.reminderSound ?? false,
  });
  const [reminderSoundIsOpen, setreminderSoundIsOpen] = useState(false);

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

  const handleReminders = useCallback(
    async (key: keyof typeof reminder) => {
      const updatedReminder = {
        ...reminder,
        [key]: !reminder[key],
      };

      // Update UI immediately
      setreminder(updatedReminder);

      try {
        const requestBody: NotificationSettingsModel = {
          reminders: updatedReminder,
        };

        await updateNotificationSettings(requestBody);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [reminder],
  );

  const handleSoundSelect = async (duration: string) => {
    console.log("Selected snooze duration:", duration);
    await updateSettings({
      reminders: {
        snoozeDuration: duration,
      },
    });
    setreminderSoundIsOpen(false);
  };

  const handleReminderSoundClose = useCallback(() => {
    setreminderSoundIsOpen((prev) => !prev);
  }, []);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const reminderS: SettingItem[] = useMemo(
    () => [
      // {
      //   leftIcon: <IconClock />,
      //   heading: "Snooze Duration",
      //   action: "reminderSound",
      //   description: "Select your preferred snooze time.",
      //   rightIcon: <IconForward />,
      // },
      {
        leftIcon: <IconInformation stroke={theme.colors.slateCharcoal} />,
        heading: "Early Reminder Alert",
        action: "earlyReminder",
        description: "An alert before your Product is due.",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleReminders("earlyReminderAlert")}
            value={reminder.earlyReminderAlert}
          />
        ),
      },
      {
        leftIcon: <IconNotifications stroke={theme.colors.slateCharcoal} />,
        heading: "Missed Dose Notifications",
        action: "missedNotification",
        description: "If a dose isn’t marked within 30 mint.",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleReminders("missedDoseNotifications")}
            value={reminder.missedDoseNotifications}
          />
        ),
      },
      {
        leftIcon: <IconClock stroke={theme.colors.slateCharcoal} />,
        heading: "Reminder Sound",
        action: "reminderSound",
        description: "Audio alert via your device speaker",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleReminders("reminderSound")}
            value={reminder.reminderSound}
          />
        ),
      },
      {
        leftIcon: <IconTorch stroke={theme.colors.slateCharcoal} />,
        heading: "Reminder Light",
        action: "reminderLight",
        description: "Activates the LED on your Taykie device",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleReminders("reminderLight")}
            value={reminder.reminderLight}
          />
        ),
      },
    ],
    [
      theme.colors.slateCharcoal,
      styles.switch,
      reminder.earlyReminderAlert,
      reminder.missedDoseNotifications,
      reminder.reminderLight,
      reminder.reminderSound,
      reminder.snoozeDuration,
      handleReminders,
      ,
    ],
  );

  const updateSettings = useCallback(async (requestBody: NotificationSettingsModel) => {
    try {
      const message = await updateNotificationSettings(requestBody);
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  return (
    <>
      {isLoading && <Loader />}
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
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
              {t(LocalizedStrings.settings.reminderSettings.title)}
            </ThemeText>
          </View>
          <View style={styles.section}>
            {reminderS.map((item, index) => (
              <ActionItem
                key={index}
                heading={t(`settings.reminderSettings.${item.action}.title`)}
                description={t(`settings.reminderSettings.${item.action}.description`)}
                leftIcon={item.leftIcon}
                rightIcon={item.rightIcon}
                onPress={() => {
                  if (item.action === "reminderSound") {
                    setreminderSoundIsOpen(true);
                    router.push(item.action as RoutePath);
                  }
                }}
              />
            ))}
          </View>
        </ScrollView>
        <SnoozeDuration
          selected={reminder.snoozeDuration}
          isVisible={reminderSoundIsOpen}
          onClose={handleReminderSoundClose}
          onSave={handleSoundSelect}
        />
      </SafeAreaView>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
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
