import { StyleSheet, TouchableOpacity, View, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

  const handleBack = React.useCallback(() => router.back(), [router]);

  const isConnected = connectionStatus === "connected";
  const lastSyncedText = lastSyncedAt
    ? `Last Synced: ${new Date(lastSyncedAt).toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}`
    : "Last Synced: --";

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
        "About Device Name",
        "This name only changes how your Taykie is labeled in the app — it isn't sent to the device itself, since the device has no way to store a custom name over Bluetooth.",
      ),
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: verticalScale(80) }}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            Device Name
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
                placeholder="Device name"
                style={styles.deviceNameInput}
                placeholderTextColor={theme.colors.text.secondary}
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
                {isConnected ? "Connected" : "Disconnected"}
              </ThemeText>
            </View>
          </View>
          <ThemeText variant="manrope.caption" style={styles.lastSynced}>
            {lastSyncedText}
          </ThemeText>
        </View>

        <Button
          title="Save Name"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveBtn}
          fullWidth
        />

        <Button
          title={isConnected ? "Disconnect" : "Connect"}
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
            Change Device
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
