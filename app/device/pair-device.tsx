import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Button } from "@/components/ui/button";
import Svg, { Path } from "react-native-svg";
import { useAuthStore } from "@/stores/authStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import {
  useBLEStore,
  useBLEScanning,
  useBLEConnection,
  useBLEPermissions,
} from "@/stores/bleStore";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function PairDeviceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((state) => state.user);
  const alert = useAlert();

  const { isScanning, scannedDevices } = useBLEScanning();
  const { connectionStatus } = useBLEConnection();
  const { hasPermissions, isBluetoothEnabled } = useBLEPermissions();
  const { initBLE, scanDevices, stopScan, connectToDevice } = useBLEStore();
  const [isConnecting, setIsConnecting] = useState(false);

  // The BLE scan itself already only matches on names containing
  // "TayKie"/"tk-" (see BLEService.startScan), so the first result is the
  // one we care about — no need for a picker here.
  const foundDevice = scannedDevices[0] ?? null;

  useEffect(() => {
    initBLE();
    return () => {
      stopScan();
    };
  }, []);

  useEffect(() => {
    if (!hasPermissions) return;
    if (!isBluetoothEnabled) {
      alert.show(
        AlertPresets.error(
          t(LocalizedStrings.device.bluetooth.alert),
          t(LocalizedStrings.device.bluetooth.alertMessage),
        ),
      );
      return;
    }
    scanDevices().catch((error: any) => {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    });
  }, [hasPermissions, isBluetoothEnabled]);

  const displayName = React.useMemo(() => {
    if (!user) return null;
    if (user.firstName) return user.firstName;
    const email = user.email || "";
    return email.split("@")[0];
  }, [user, t]);

  const avatarInitial = displayName?.charAt(0).toUpperCase();
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  const handleConnect = React.useCallback(async () => {
    if (!foundDevice || isConnecting || connectionStatus !== "disconnected") return;
    setIsConnecting(true);
    try {
      await connectToDevice(foundDevice.id);
      router.back();
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    } finally {
      setIsConnecting(false);
    }
  }, [foundDevice, isConnecting, connectionStatus, connectToDevice, router]);

  const handleRetryScan = React.useCallback(async () => {
    try {
      await scanDevices();
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [scanDevices]);

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <SafeAreaView>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
          <View>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <View style={styles.backButtonInner}>
                <IconBackArrow />
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.headerRow]}>
            <ThemeText variant="manrope.h2" style={styles.header}>
              {t(LocalizedStrings.device.pairDevice)}
            </ThemeText>
          </View>
          <View style={[styles.descriptionRow]}>
            <Text style={[styles.description]}>
              {t(LocalizedStrings.device.connectViaBluetooth)}
            </Text>
          </View>
          <View style={styles.iconWrapper}>
            <View style={styles.iconC1}>
              <View style={styles.iconC2}>
                <Svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                  <Path
                    d="M17.5 17.5L42.5 42.5L30 55V5L42.5 17.5L17.5 42.5"
                    stroke={theme.colors.primary.main}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>
          </View>
          <Text style={styles.searching}>
            {isScanning
              ? "Searching for nearby devices..."
              : foundDevice
                ? "Device found"
                : "No Taykie device found nearby"}
          </Text>
          {isScanning && !foundDevice ? (
            <ActivityIndicator
              style={{ marginTop: verticalScale(20) }}
              color={theme.colors.primary.main}
            />
          ) : (
            <Text style={styles.selectedDevice}>{foundDevice?.name || "--"}</Text>
          )}
          <View style={{ marginTop: verticalScale(30) }}>
            {!isScanning && !foundDevice ? (
              <Button
                title="Try Again"
                onPress={handleRetryScan}
                textStyle={{ fontSize: moderateScale(20) }}
                rightIcon={null}
              />
            ) : (
              <Button
                title={isConnecting ? "Connecting..." : "Connect"}
                onPress={handleConnect}
                disabled={!foundDevice || isConnecting}
                textStyle={{ fontSize: moderateScale(20) }}
                rightIcon={null}
              />
            )}
          </View>
          <View style={styles.manuallyWrapper}>
            <Text style={styles.manuallyWrapperText}>
              {t(LocalizedStrings.device.cantFindDevice)}
            </Text>
            <Pressable>
              <Text style={[styles.manuallyWrapperTextBold]}>
                {t(LocalizedStrings.device.enterManually)}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
      textAlign: "center",
      margin: 0,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
      justifyContent: "center",
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
    descriptionRow: {
      maxWidth: scale(275),
      marginHorizontal: "auto",
      marginTop: verticalScale(10),
      justifyContent: "center",
      alignItems: "center",
    },
    description: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
      textAlign: "center",
    },
    iconWrapper: {
      marginTop: verticalScale(30),
      justifyContent: "center",
      alignItems: "center",
    },
    iconC1: {
      aspectRatio: 1,
      height: verticalScale(120),
      borderRadius: 999,
      backgroundColor: "#DDDDDD",
      justifyContent: "center",
      alignItems: "center",
    },
    iconC2: {
      aspectRatio: 1,
      height: verticalScale(90),
      borderRadius: 999,
      backgroundColor: "#B4B4B4",
      justifyContent: "center",
      alignItems: "center",
    },
    searching: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
      textAlign: "center",
      marginTop: verticalScale(20),
    },
    selectedDevice: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.primary.dark,
      textAlign: "center",
      marginTop: verticalScale(20),
    },
    manuallyWrapper: {
      flexDirection: "row",
      gap: scale(4),
      justifyContent: "center",
      marginTop: verticalScale(20),
    },
    manuallyWrapperText: {
      fontSize: moderateScale(moderateScale(14)),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
    },
    manuallyWrapperTextBold: {
      fontSize: 14,
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
  });
