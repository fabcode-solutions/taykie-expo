import { StyleSheet, TouchableOpacity, View, ScrollView, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { SettingItem } from "@/data/settings";
import ActionItem from "@/components/settings/ActionItem";
import Switch from "@/components/ui/Switch";
import SnoozeDuration from "@/components/settings/SnoozeDuration";
import IconInformation from "@/components/icons/IconInformation";
import IconApple from "@/components/icons/settings/IconApple";
import IconGoogleFit from "@/components/icons/settings/IconGoogleFit";
import IconFitbit from "@/components/icons/settings/IconFitbit";
import IconGarmin from "@/components/icons/settings/IconGarmin";
import IconWatch from "@/components/icons/settings/IconWatch";
import IconRing from "@/components/icons/settings/IconRing";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { NotificationSettingsModel, useNotificationStore } from "@/stores/notificationStore";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function IntegrationsScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const { fetchNotificationSettings, updateNotificationSettings, notificationSettings } =
    useNotificationStore();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [integrations, setIntegrations] = useState({
    appleHealth: notificationSettings?.integrations?.appleHealth ?? false,
    googleFit: notificationSettings?.integrations?.googleFit ?? false,
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
  }, [t]);

  const handleIntegrations = useCallback(
    async (key: keyof typeof integrations) => {
      // Update local state immediately
      setIntegrations((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));

      try {
        // Build request body for API
        const requestBody: NotificationSettingsModel = {
          integrations: {
            [key]: !integrations[key], // update the changed value
          },
        };

        // Call API to update settings
        await updateNotificationSettings(requestBody);
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [integrations, updateNotificationSettings],
  );

  const handlereminderSoundClose = useCallback(() => {
    setreminderSoundIsOpen((prev) => !prev);
  }, []);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const integrationMenu: SettingItem[] = useMemo(
    () => [
      {
        leftIcon: <IconApple />,
        heading: "Apple Health",
        action: "appleHealth",
        description: "Sync Products, heart rate, and steps",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleIntegrations("appleHealth")}
            value={integrations.appleHealth}
          />
        ),
      },
      {
        leftIcon: <IconGoogleFit />,
        heading: "Google Fit",
        action: "googleFit",
        description: "Track your activity and sleep automatically",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleIntegrations("googleFit")}
            value={integrations.googleFit}
          />
        ),
      },
    ],
    [styles.switch, integrations.appleHealth, integrations.googleFit],
  );
  const [activeDevice, setActiveDevice] = useState({
    "Fitbit": false,
    "Garmin": false,
    "Galaxy Watch": false,
    "Oura Ring": false,
  });
  const deviceS: SettingItem[] = useMemo(
    () => [
      {
        leftIcon: <IconFitbit />,
        heading: "Fitbit",
        action: "fitbit",
        description: "Sync sleeps & activity data",
        rightIcon: null,
      },
      {
        leftIcon: <IconGarmin />,
        heading: "Garmin",
        action: "garmin",
        description: "Track activity insights",
        rightIcon: null,
      },
      {
        leftIcon: <IconWatch />,
        heading: "Galaxy Watch",
        action: "galaxyWatch",
        description: "Sync vitals & reminders",
        rightIcon: null,
      },
      {
        leftIcon: <IconRing />,
        heading: "Oura Ring",
        action: "ouraRing",
        description: "Connect for sleep & readiness data",
        rightIcon: null,
      },
    ],
    [],
  );
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
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
            {t(LocalizedStrings.settings.integrations.title)}
          </ThemeText>
          <IconInformation />
        </View>
        <Text style={styles.content}>{t(LocalizedStrings.settings.integrations.description)}</Text>
        <Text style={styles.heading}>{t(LocalizedStrings.settings.integrations.health_apps)}</Text>
        <View style={styles.section}>
          {integrationMenu.map((item, index) => (
            <ActionItem
              key={index}
              heading={t(`settings.integrations.${item.action}.title`)}
              description={t(`settings.integrations.${item.action}.description`)}
              leftIcon={item.leftIcon}
              rightIcon={item.rightIcon}
              onPress={() => {}}
            />
          ))}
        </View>
        <Text style={styles.heading}>
          {t(LocalizedStrings.settings.integrations.manage_connections)}
        </Text>
        <View style={styles.deviceS}>
          {deviceS.map((item, index) => (
            <View style={styles.deviceSInner} key={`device-${index}`}>
              <View style={styles.deviceSLeft}>
                <View style={styles.deviceSIcon}>{item.leftIcon}</View>
                <View>
                  <Text style={styles.deviceHeading}>
                    {t(`settings.integrations.${item.action}.title`)}
                  </Text>
                  <Text style={styles.deviceDescription}>
                    {t(`settings.integrations.${item.action}.description`)}
                  </Text>
                </View>
              </View>
              <View style={styles.btnWrapper}>
                <Pressable
                  onPress={() =>
                    setActiveDevice((prev) => ({
                      ...prev,
                      [item.heading]:
                        !prev[item.heading as "Oura Ring" | "Galaxy Watch" | "Garmin" | "Fitbit"],
                    }))
                  }
                  style={[
                    styles.connectBtn,
                    activeDevice[
                      item.heading as "Oura Ring" | "Galaxy Watch" | "Garmin" | "Fitbit"
                    ] && styles.connectBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.connectBtnText,
                      activeDevice[
                        item.heading as "Oura Ring" | "Galaxy Watch" | "Garmin" | "Fitbit"
                      ] && styles.connectBtnTextActive,
                    ]}
                  >
                    {activeDevice[
                      item.heading as "Oura Ring" | "Galaxy Watch" | "Garmin" | "Fitbit"
                    ]
                      ? t(LocalizedStrings.common.connected)
                      : t(LocalizedStrings.common.connect)}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <SnoozeDuration isVisible={reminderSoundIsOpen} onClose={handlereminderSoundClose} />
    </SafeAreaView>
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
    content: {
      fontSize: moderateScale(16),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
      marginTop: verticalScale(10),
    },

    heading: {
      fontSize: moderateScale(16),
      marginTop: verticalScale(20),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
      justifyContent: "space-between",
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
      marginTop: verticalScale(10),
      gap: verticalScale(14),
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
    deviceS: {
      flexDirection: "row",
      gap: verticalScale(10),
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: verticalScale(10),
    },
    deviceSInner: {
      padding: verticalScale(12),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      width: "48.5%",
    },
    deviceSLeft: {
      flexDirection: "row",
      gap: scale(10),
    },
    deviceSIcon: {
      aspectRatio: 1,
      height: verticalScale(40),
      backgroundColor: theme.colors.background.default,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 999,
    },
    deviceHeading: {
      fontSize: moderateScale(16),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
    },
    deviceDescription: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
      maxWidth: scale(100),
    },
    btnWrapper: {
      flexDirection: "row",
      paddingLeft: scale(27),
      marginTop: verticalScale(14),
    },
    connectBtn: {
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(24),
      backgroundColor: theme.colors.slateCharcoal,
      borderRadius: moderateScale(40),
      justifyContent: "center",
      alignItems: "center",
    },
    connectBtnActive: {
      backgroundColor: theme.colors.primary.main,
    },
    connectBtnText: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.white,
    },
    connectBtnTextActive: {
      color: theme.colors.text.primary,
    },
  });
