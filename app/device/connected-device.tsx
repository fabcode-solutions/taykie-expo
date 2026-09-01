import { StyleSheet, TouchableOpacity, View, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { SettingItem } from "@/data/settings";
import Switch from "@/components/ui/Switch";
import SnoozeDuration from "@/components/settings/SnoozeDuration";
import IconInformation from "@/components/icons/IconInformation";
import IconApple from "@/components/icons/settings/IconApple";
import IconGoogleFit from "@/components/icons/settings/IconGoogleFit";
import IconFitbit from "@/components/icons/settings/IconFitbit";
import IconGarmin from "@/components/icons/settings/IconGarmin";
import IconWatch from "@/components/icons/settings/IconWatch";
import IconRing from "@/components/icons/settings/IconRing";
import { Button } from "@/components/ui/button";
import Svg, { Path } from "react-native-svg";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function ConnectedDeviceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reminder, setreminder] = useState({
    early: true,
    missed: true,
  });
  const [reminderSoundIsOpen, setreminderSoundIsOpen] = useState(false);
  const handlereminders = useCallback((action: boolean, key: keyof typeof reminder) => {
    setreminder((prev) => ({
      ...prev,
      [key]: !action,
    }));
  }, []);

  const handlereminderSoundClose = useCallback(() => {
    setreminderSoundIsOpen((prev) => !prev);
  }, []);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const reminderS: SettingItem[] = useMemo(
    () => [
      {
        leftIcon: <IconApple />,
        heading: "Apple Health",
        action: "appleHealth",
        description: "Sync Products, heart rate, and steps",
        rightIcon: (
          <Switch
            style={styles.switch}
            onPress={() => handlereminders(reminder.missed, "missed")}
            value={reminder.missed}
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
            onPress={() => handlereminders(reminder.early, "early")}
            value={reminder.early}
          />
        ),
      },
    ],
    [styles.switch, reminder.early, reminder.missed, handlereminders],
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
            {t(LocalizedStrings.device.name)}
          </ThemeText>
          <IconInformation />
        </View>
        <View style={[styles.deviceWrapper]}>
          <View style={[styles.deviceWrapperLeft]}>
            <Svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <Path
                d="M42.5 5H17.5C14.7386 5 12.5 7.23858 12.5 10V50C12.5 52.7614 14.7386 55 17.5 55H42.5C45.2614 55 47.5 52.7614 47.5 50V10C47.5 7.23858 45.2614 5 42.5 5Z"
                stroke={theme.colors.slateCharcoal}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M30 45H30.025"
                stroke={theme.colors.slateCharcoal}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>

            <View>
              <Text style={[styles.deviceName]}>iPhone 16 Pro</Text>
              <View style={[styles.deviceInfoWrapper]}>
                <Text style={[styles.deviceVersion]}>iOS 17.0</Text>
                <View style={[styles.deviceStatusWrapper]}>
                  <View style={[styles.deviceDot]}></View>
                  <Text style={[styles.deviceStatus]}>Connected</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={[styles.deviceLastSync]}>Last Synced: Today 10:30 AM</Text>
        </View>
        <View style={{ marginTop: verticalScale(30), gap: verticalScale(20) }}>
          <Button
            title={`${t(LocalizedStrings.common.connect)} / ${t(LocalizedStrings.common.disconnect)}`}
            onPress={() => router.push("/device/connected-device")}
            textStyle={{ fontSize: moderateScale(20) }}
            rightIcon={null}
          />
          <Button
            title={t(LocalizedStrings.device.changeDevice)}
            onPress={() => router.push("/device/pair-device")}
            textStyle={{ fontSize: moderateScale(20) }}
            style={styles.changeButton}
            rightIcon={null}
          />
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
      gap: scale(10),
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
    btnWrapper: { flexDirection: "row", paddingLeft: scale(27), marginTop: verticalScale(14) },
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
    deviceWrapper: {
      backgroundColor: theme.colors.white,
      padding: verticalScale(16),
      borderRadius: moderateScale(20),
      marginTop: verticalScale(20),
    },
    deviceWrapperLeft: {
      flexDirection: "row",
      gap: scale(10),
      alignItems: "center",
    },
    deviceName: {
      fontSize: moderateScale(20),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
    },
    deviceInfoWrapper: {
      flexDirection: "row",
      gap: scale(70),
      alignItems: "center",
      justifyContent: "space-between",
      flex: 1,
    },
    deviceVersion: {
      fontSize: moderateScale(16),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.primary.dark,
    },
    deviceStatusWrapper: { flexDirection: "row", gap: 5, alignItems: "center" },
    deviceDot: {
      width: scale(8),
      height: verticalScale(8),
      backgroundColor: "#47D257",
      borderRadius: moderateScale(50),
    },
    deviceStatus: {
      fontSize: moderateScale(16),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.primary.dark,
    },
    deviceLastSync: {
      fontSize: moderateScale(16),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.primary.dark,
      marginTop: verticalScale(30),
      marginLeft: scale(13),
    },
    changeButton: {
      backgroundColor: theme.colors.background.default,
      borderColor: theme.colors.border,
      borderWidth: scale(1),
    },
  });
