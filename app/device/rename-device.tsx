import { StyleSheet, TouchableOpacity, View, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Button } from "@/components/ui/button";
import { useBLEConnection, useBLEDeviceData, useBLEStore } from "@/stores/bleStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function RenameDeviceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { connectedDevice, connectionStatus } = useBLEConnection();
  const { lastSyncedAt } = useBLEDeviceData();
  const { renameDevice, connectToDevice, disconnectDevice } = useBLEStore();

  const [name, setName] = useState(connectedDevice?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // The initial useState above only runs once — if this screen is opened
  // before connectedDevice has loaded (e.g. mid-reconnect), the input would
  // otherwise stay stuck empty even once the real name arrives. Only syncs
  // while the user hasn't started typing their own edit, so an in-progress
  // rename never gets clobbered by a background reconnect/refresh.
  useEffect(() => {
    if (connectedDevice?.name && name === "") setName(connectedDevice.name);
  }, [connectedDevice?.name]);

  const handleBack = React.useCallback(() => router.back(), [router]);

  const isConnected = connectionStatus === "connected";
  const trimmedName = name.trim();
  const isDirty = trimmedName.length > 0 && trimmedName !== (connectedDevice?.name ?? "").trim();
  const lastSyncedText = lastSyncedAt
    ? t(LocalizedStrings.device.lastSynced, {
        time: new Date(lastSyncedAt).toLocaleString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }),
      })
    : t(LocalizedStrings.device.lastSynced, { time: "--" });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await renameDevice(name);
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success)));
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleConnection = async () => {
    if (!connectedDevice) return;
    setIsToggling(true);
    try {
      if (isConnected) {
        await disconnectDevice();
      } else {
        await connectToDevice(connectedDevice.id);
      }
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    } finally {
      setIsToggling(false);
    }
  };

  const handleChangeDevice = () => {
    router.push("/device/pair-device");
  };

  const handleInfo = () => {
    alert.show(
      AlertPresets.info(
        t(LocalizedStrings.device.rename.aboutTitle),
        t(LocalizedStrings.device.rename.aboutMessage),
      ),
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: verticalScale(80) }}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            {t(LocalizedStrings.device.rename.heading)}
          </ThemeText>
          <TouchableOpacity onPress={handleInfo} activeOpacity={0.7}>
            <Ionicons
              name="information-circle-outline"
              size={moderateScale(22)}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.deviceCard}>
          <View style={styles.deviceCardTop}>
            <View style={styles.deviceIconWrapper}>
              <Ionicons
                name="hardware-chip-outline"
                size={moderateScale(24)}
                color={theme.colors.primary.main}
              />
            </View>
            <View style={styles.deviceNameField}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t(LocalizedStrings.device.rename.placeholder)}
                style={styles.deviceNameInput}
                placeholderTextColor={theme.colors.text.secondary}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? "#47D257" : theme.colors.text.disabled },
                ]}
              />
              <ThemeText variant="manrope.caption" style={styles.statusText}>
                {isConnected ? t(LocalizedStrings.common.connected) : t(LocalizedStrings.device.connection.disconnected)}
              </ThemeText>
            </View>
          </View>
          <ThemeText variant="manrope.caption" style={styles.lastSynced}>
            {lastSyncedText}
          </ThemeText>
        </View>

        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={moderateScale(16)}
            color={theme.colors.text.secondary}
            style={styles.infoNoteIcon}
          />
          <ThemeText variant="manrope.caption" style={styles.infoNoteText}>
            {t(LocalizedStrings.device.rename.inAppOnly)}
          </ThemeText>
        </View>

        <View>
          <Button
            title={t(LocalizedStrings.device.rename.save)}
            onPress={handleSave}
            loading={isSaving}
            disabled={!isDirty}
            style={styles.saveBtn}
            fullWidth
          />
        </View>
        <Button
          title={
            isConnected ? t(LocalizedStrings.common.disconnect) : t(LocalizedStrings.common.connect)
          }
          onPress={handleToggleConnection}
          loading={isToggling}
          disabled={!connectedDevice}
          style={styles.primaryBtn}
          fullWidth
        />

        <TouchableOpacity
          onPress={handleChangeDevice}
          style={styles.changeDeviceBtn}
          activeOpacity={0.7}
        >
          <ThemeText variant="manrope.body1Bold" style={styles.changeDeviceText}>
            {t(LocalizedStrings.device.changeDevice)}
          </ThemeText>
        </TouchableOpacity>
      </ScrollView>
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
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: verticalScale(20),
      marginBottom: verticalScale(20),
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
    deviceCard: {
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(16),
      padding: scale(16),
      marginBottom: verticalScale(24),
    },
    deviceCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
    },
    deviceIconWrapper: {
      width: scale(40),
      height: scale(40),
      borderRadius: moderateScale(10),
      backgroundColor: "rgba(0, 149, 255, 0.10)",
      justifyContent: "center",
      alignItems: "center",
    },
    deviceNameField: {
      flex: 1,
    },
    deviceNameInput: {
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
      paddingVertical: verticalScale(4),
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(6),
    },
    statusDot: {
      width: scale(8),
      height: scale(8),
      borderRadius: 999,
    },
    statusText: {
      color: theme.colors.text.secondary,
    },
    lastSynced: {
      color: theme.colors.text.secondary,
      marginTop: verticalScale(12),
    },
    infoNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: scale(6),
      marginBottom: verticalScale(20),
    },
    infoNoteIcon: {
      marginTop: verticalScale(1),
    },
    infoNoteText: {
      flex: 1,
      color: theme.colors.text.secondary,
    },
    saveBtn: {
      height: verticalScale(50),
      borderRadius: 999,
      backgroundColor: theme.colors.background.paper,
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      marginBottom: verticalScale(12),
    },
    primaryBtn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      marginBottom: verticalScale(12),
    },
    changeDeviceBtn: {
      height: verticalScale(60),
      borderRadius: 999,
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    changeDeviceText: {
      color: theme.colors.text.primary,
    },
  });
