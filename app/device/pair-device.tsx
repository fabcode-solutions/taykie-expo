import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
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
import { findTaykieDevice } from "@/utils/reminderSound";

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

  // The scan (see BLEService.startScan) no longer stops itself after the
  // first match, so more than one nearby Taykie device can actually show up
  // here now. Sorted strongest-signal-first so the closest device — the
  // most likely one the user actually means — leads the list.
  const sortedDevices = React.useMemo(
    () => [...scannedDevices].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)),
    [scannedDevices],
  );
  const hasMultipleDevices = sortedDevices.length > 1;
  // With exactly one match, keep the simpler single-device flow below
  // (found name + one "Connect" button) rather than a one-row list.
  const foundDevice = !hasMultipleDevices ? (sortedDevices[0] ?? null) : null;
  const isSearching = isScanning && sortedDevices.length === 0;
  const isBusy = isSearching || isConnecting || connectionStatus === "connecting";

  // Pulsing ring around the bluetooth icon while actively searching for a
  // device or connecting to one — the static icon otherwise gave no
  // feedback that anything was happening until the scan/connect either
  // succeeded or failed, which could take several seconds either way.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isBusy) {
      pulse.value = withRepeat(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [isBusy]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  useEffect(() => {
    initBLE();
    return () => {
      stopScan();
    };
  }, []);

  // Covers both cases: a device already connected before this screen was
  // opened (nothing to scan/connect for — just reflect it and leave), and a
  // device that becomes connected during this screen's own scan/connect flow
  // (replacing the old router.back(), which returned to whatever screen
  // happened to open this one rather than reliably landing on Device).
  useEffect(() => {
    if (connectionStatus === "connected") {
      router.replace("/(tabs)/device");
    }
  }, [connectionStatus, router]);

  useEffect(() => {
    if (connectionStatus === "connected") return;
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
  }, [hasPermissions, isBluetoothEnabled, connectionStatus]);

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

  const handleConnectToId = React.useCallback(
    async (deviceId: string) => {
      if (isConnecting || connectionStatus !== "disconnected") return;
      setIsConnecting(true);
      try {
        // No explicit navigation here — the connectionStatus effect above
        // redirects to Device as soon as connectToDevice flips it to
        // "connected".
        await connectToDevice(deviceId);
        // Per Delivered_Feature_Description.md §1: tapping the device name
        // is the documented trigger for the warm-white connection-confirm
        // blink (3 blinks over 21s) — same pattern "Find My Taykie" uses.
        findTaykieDevice();
      } catch (error: any) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      } finally {
        setIsConnecting(false);
      }
    },
    [isConnecting, connectionStatus, connectToDevice],
  );

  const handleConnect = React.useCallback(() => {
    if (!foundDevice) return;
    return handleConnectToId(foundDevice.id);
  }, [foundDevice, handleConnectToId]);

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
            <Animated.View style={[styles.iconC1, isBusy && pulseStyle]}>
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
            </Animated.View>
          </View>
          <Text style={styles.searching}>
            {isConnecting || connectionStatus === "connecting"
              ? "Connecting to device..."
              : isSearching
                ? "Searching for nearby devices..."
                : hasMultipleDevices
                  ? "Multiple devices found — tap one to connect"
                  : foundDevice
                    ? "Device found"
                    : "No Taykie device found nearby"}
          </Text>
          {hasMultipleDevices ? (
            <FlatList
              data={sortedDevices}
              keyExtractor={(item) => item.id}
              style={styles.deviceList}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deviceRow}
                  activeOpacity={0.7}
                  disabled={isConnecting}
                  onPress={() => handleConnectToId(item.id)}
                >
                  <Ionicons name="bluetooth" size={moderateScale(22)} color={theme.colors.primary.main} />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{item.name || "Unnamed Taykie Device"}</Text>
                    <Text style={styles.deviceRssi}>Signal: {item.rssi ?? "--"} dBm</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={moderateScale(18)}
                    color={theme.colors.primary.dark}
                  />
                </TouchableOpacity>
              )}
            />
          ) : isBusy ? (
            <ActivityIndicator
              style={{ marginTop: verticalScale(20) }}
              color={theme.colors.primary.main}
            />
          ) : (
            <Text style={styles.selectedDevice}>{foundDevice?.name || "--"}</Text>
          )}
          {!hasMultipleDevices && (
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
          )}
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
    deviceList: {
      marginTop: verticalScale(20),
    },
    deviceRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.white,
      padding: scale(14),
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(10),
      borderWidth: scale(1),
      borderColor: "rgba(0,0,0,0.06)",
    },
    deviceInfo: {
      flex: 1,
      marginLeft: scale(12),
    },
    deviceName: {
      fontSize: moderateScale(15),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
    deviceRssi: {
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
      marginTop: verticalScale(2),
    },
  });
