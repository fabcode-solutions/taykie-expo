"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import {
  useBLEStore,
  useBLEConnection,
  useBLEScanning,
  useBLEPermissions,
} from "@/stores/bleStore";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

type PairingState =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "failed"
  | "timeout"
  | "bluetooth_off";

export default function PairDevice() {
  const theme = useTheme();
  const alert = useAlert();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { currentStep, totalSteps, nextStep, prevStep, setPairedDeviceName } = useOnboardingStore();

  // BLE Store Hooks
  const { isScanning, scannedDevices } = useBLEScanning();
  const { connectionStatus } = useBLEConnection();
  const { isBluetoothEnabled } = useBLEPermissions();
  const { initBLE, scanDevices, stopScan, connectToDevice } = useBLEStore();

  // Local UI State
  const [pairingState, setPairingState] = useState<PairingState>("idle");
  const wasScanning = useRef(false); // Add this to track scanning transitions!

  // 1. Sync local UI state with Global BLE Connection Status
  useEffect(() => {
    if (connectionStatus === "connecting") {
      setPairingState("connecting");
    } else if (connectionStatus === "connected") {
      setPairingState("connected");
    } else if (connectionStatus === "disconnected" && pairingState === "connecting") {
      setPairingState("failed");
    }
  }, [connectionStatus]);

  // 2. Handle Scanner Timeout (FIXED RACE CONDITION)
  useEffect(() => {
    // Only trigger timeout if we WERE scanning, and now we stopped (true -> false), and found nothing
    if (
      wasScanning.current &&
      !isScanning &&
      pairingState === "scanning" &&
      scannedDevices.length === 0
    ) {
      setPairingState("timeout");
    }

    // Always keep track of what the previous state was
    wasScanning.current = isScanning;
  }, [isScanning, scannedDevices.length, pairingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  const handleStartScan = async () => {
    setPairingState("scanning");
    await initBLE(); // Requests permissions & checks BT status
    scanDevices(); // Triggers the 10s scan
  };

  const handleConnect = async (deviceId: string) => {
    try {
      await stopScan(); // Stop scanning before connecting
      await connectToDevice(deviceId);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  const handleRetry = () => {
    setPairingState("idle");
    handleStartScan();
  };

  const handleContinue = () => {
    nextStep();
    router.push("/(onboarding)/dosage-frequency");
  };

  const handleSkip = async () => {
    try {
      await stopScan();
      setPairedDeviceName(null);
      nextStep();
      router.push("/(onboarding)/dosage-frequency");
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  const handleBack = async () => {
    try {
      await stopScan();
      prevStep();
      router.back();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  const renderStateContent = () => {
    switch (pairingState) {
      case "scanning":
        return (
          <View style={[styles.stateCard]}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <ThemeText variant="manrope.body1Bold" style={styles.stateTitle}>
              {scannedDevices.length > 0
                ? t(LocalizedStrings.device.avlDevices)
                : t(LocalizedStrings.onboarding.searching)}
            </ThemeText>

            {/* List of Found Devices */}
            <FlatList
              data={scannedDevices}
              style={styles.deviceList} // Applied the existing style that contains width: '100%'
              contentContainerStyle={{ flexGrow: 1, paddingBottom: verticalScale(20) }} // Ensures empty component centers properly
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.deviceRow}
                  onPress={() => handleConnect(item.id)}
                >
                  <Ionicons
                    name="bluetooth"
                    size={moderateScale(24)}
                    color={theme.colors.primary.main}
                  />
                  <View style={styles.deviceInfo}>
                    <ThemeText variant="manrope.body1Bold">
                      {item.name || "Unnamed Taykie Device"}
                    </ThemeText>
                    <ThemeText
                      variant="manrope.caption"
                      style={{ color: theme.colors.text.secondary2 }}
                    >
                      {t(LocalizedStrings.device.tap_to_connect)}
                    </ThemeText>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={moderateScale(20)}
                    color={theme.colors.text.secondary2}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: verticalScale(20),
                  }}
                >
                  <ThemeText
                    variant="manrope.body2"
                    style={[styles.stateMsg, { color: theme.colors.text.secondary2 }]}
                  >
                    {!isBluetoothEnabled
                      ? t(LocalizedStrings.device.bluetooth.turn_on)
                      : t(LocalizedStrings.device.bluetooth.make_sure)}
                  </ThemeText>
                </View>
              }
            />
          </View>
        );
      case "connecting":
        return (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <ThemeText variant="manrope.body1Bold" style={styles.stateTitle}>
              {t(LocalizedStrings.device.pairing_with)}
            </ThemeText>
            <ThemeText
              variant="manrope.body2"
              style={[styles.stateMsg, { color: theme.colors.text.secondary2 }]}
            >
              {t(LocalizedStrings.device.please_wait)}
            </ThemeText>
          </View>
        );
      case "connected":
        return (
          <View style={styles.stateCard}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.success.light }]}>
              <Ionicons
                name="checkmark-circle"
                size={moderateScale(48)}
                color={theme.colors.success.main}
              />
            </View>
            <ThemeText variant="manrope.body1Bold" style={styles.stateTitle}>
              {t(LocalizedStrings.device.taykie_connected)}
            </ThemeText>
          </View>
        );
      case "timeout":
        return (
          <View style={styles.stateCard}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.warning.light }]}>
              <Ionicons
                name="bluetooth-outline"
                size={moderateScale(40)}
                color={theme.colors.warning.main}
              />
            </View>
            <ThemeText variant="manrope.body1Bold" style={styles.stateTitle}>
              {t(LocalizedStrings.device.not_found)}
            </ThemeText>
            <ThemeText
              variant="manrope.body2"
              style={[styles.stateMsg, { color: theme.colors.text.secondary2 }]}
            >
              {t(LocalizedStrings.device.make_sure_is_charged)}
            </ThemeText>
          </View>
        );
      case "failed":
        return (
          <View style={styles.stateCard}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.error.light }]}>
              <Ionicons
                name="close-circle"
                size={moderateScale(48)}
                color={theme.colors.error.main}
              />
            </View>
            <ThemeText variant="manrope.body1Bold" style={styles.stateTitle}>
              {t(LocalizedStrings.device.pairing_failed)}
            </ThemeText>
            <ThemeText
              variant="manrope.body2"
              style={[styles.stateMsg, { color: theme.colors.text.secondary2 }]}
            >
              {t(LocalizedStrings.device.something_went_wrong)}
            </ThemeText>
          </View>
        );
      case "idle":
        return (
          <View style={styles.stateCard}>
            <View
              style={[styles.iconCircle, { backgroundColor: theme.colors.primary.main + "33" }]}
            >
              <Ionicons
                name="bluetooth"
                size={moderateScale(40)}
                color={theme.colors.primary.main}
              />
            </View>
            <ThemeText variant="manrope.body1Bold" style={styles.stateTitle}>
              {t(LocalizedStrings.device.ready)}
            </ThemeText>
            <ThemeText
              variant="manrope.body2"
              style={[styles.stateMsg, { color: theme.colors.text.secondary2 }]}
            >
              {t(LocalizedStrings.device.tap_to_search)}
            </ThemeText>
          </View>
        );
    }
  };

  const renderActions = () => {
    if (pairingState === "idle") {
      return (
        <ThemeButton
          title={t(LocalizedStrings.device.start_searching)}
          onPress={handleStartScan}
          style={styles.btn}
          textStyle={styles.btnText}
          fullWidth
        />
      );
    }
    if (pairingState === "scanning" || pairingState === "connecting") {
      // Don't show buttons while actively loading/scanning,
      // User must tap a device from the list
      return null;
    }
    if (pairingState === "connected") {
      return (
        <ThemeButton
          title={t(LocalizedStrings.common.continue)}
          onPress={handleContinue}
          style={styles.btn}
          textStyle={styles.btnText}
          fullWidth
        />
      );
    }
    // timeout or failed
    return (
      <View style={styles.retryRow}>
        <ThemeButton
          title={t(LocalizedStrings.device.try_again)}
          onPress={handleRetry}
          style={styles.btn}
          textStyle={styles.btnText}
          fullWidth
        />
      </View>
    );
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      showBack
      showSkip
      onSkip={handleSkip}
    >
      <View style={styles.heading}>
        <ThemeText variant="gs.h2" style={styles.title}>
          {t(LocalizedStrings.device.pair_taykie)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.device.connect_taykie)}
        </ThemeText>
      </View>

      {renderStateContent()}

      <View style={styles.actions}>{renderActions()}</View>

      {/* {pairingState !== "connected" && (
        <View style={styles.skipRow}>
          <ThemeText
            variant="manrope.body2"
            style={{ color: theme.colors.text.secondary2 }}
            onPress={handleSkip}
          >
            {t(LocalizedStrings.device.pair_later)}
            <ThemeText variant="manrope.body2Bold" style={{ color: theme.colors.slateCharcoal }}>
              {t(LocalizedStrings.device.device_settings)}
            </ThemeText>
          </ThemeText>
        </View>
      )} */}
    </OnboardingLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heading: {
      marginTop: verticalScale(8),
      marginBottom: verticalScale(24),
      gap: verticalScale(8),
    },
    title: { textAlign: "left" },
    subtitle: {},
    stateCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: verticalScale(20),
      gap: verticalScale(12),
      minHeight: verticalScale(250),
    },
    iconCircle: {
      width: scale(80),
      height: scale(80),
      borderRadius: moderateScale(40),
      justifyContent: "center",
      alignItems: "center",
    },
    stateTitle: {
      textAlign: "center",
    },
    stateMsg: {
      textAlign: "center",
      paddingHorizontal: scale(16),
    },
    deviceList: {
      width: "100%",
      flex: 1,
      marginTop: verticalScale(12),
    },
    deviceRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.white,
      padding: scale(16),
      borderRadius: moderateScale(12),
      marginBottom: verticalScale(8),
      borderWidth: scale(1),
      borderColor: "rgba(0,0,0,0.05)",
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.05,
      shadowRadius: moderateScale(3),
      elevation: 2,
    },
    deviceInfo: {
      flex: 1,
      marginLeft: scale(12),
    },
    actions: {
      marginTop: verticalScale(8),
    },
    retryRow: {
      gap: verticalScale(12),
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
    btnText: {
      color: theme.colors.slateCharcoal,
    },
    skipRow: {
      alignItems: "center",
      marginTop: verticalScale(20),
    },
  });
