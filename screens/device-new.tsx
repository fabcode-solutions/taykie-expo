import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaScreen, ThemeStatusBar, ThemeText, ThemeView } from "@/components";
import { fontFamily, useTheme, type Theme } from "@/theme";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import IconSearch from "@/components/icons/IconSearch";
import IconRefresh from "@/components/icons/IconRefresh";
import IconRemane from "@/components/icons/IconRemane";
import DeviceScanModal from "@/components/device/DeviceScanModal";
import DeviceConnectionCard from "@/components/device/DeviceConnectionCard";
import DeviceCompartments from "@/components/device/DeviceCompartments";
import {
  useBLEPermissions,
  useBluetoothState,
  useDeviceData,
  useDeviceSubscriptions,
  useDisconnectDevice,
  useRenameDevice,
  useUpdateFirmware,
} from "@/hooks/useBLE";
import { useBLEConnection } from "@/stores/bleStore";
import crossPlatformAlert from "@/utils/crossPlatformAlert";
import { moderateScale } from "@/utils/scale";

type DeviceActionKey = "find" | "update" | "rename";

interface DeviceAction {
  key: DeviceActionKey;
  label: string;
  icon: "search" | "refresh" | "pencil";
}

const ACTIONS: DeviceAction[] = [
  { key: "find", label: "Find My Taykie", icon: "search" },
  { key: "update", label: "Update Firmware", icon: "refresh" },
  { key: "rename", label: "Rename Device", icon: "pencil" },
];

/**
 * DeviceScreen - FIXED VERSION
 *
 * Fixes applied:
 * 1. Use primitive value instead of object for query dependencies
 * 2. Added ref guards for alerts to prevent repeated shows
 * 3. Stable dependencies in all hooks
 */
export default function DeviceScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Local state
  const [showScanModal, setShowScanModal] = useState(false);

  // Refs to prevent repeated alerts
  const permissionAlertShown = useRef(false);
  const bluetoothAlertShown = useRef(false);

  // BLE hooks
  const { data: hasPermissions } = useBLEPermissions();
  const { data: isBluetoothEnabled } = useBluetoothState();
  const { connectedDevice, connectionStatus } = useBLEConnection();

  // ✅ FIX: Use primitive value instead of object
  const isConnected = connectionStatus === "connected";
  const { data: deviceData, refetch: refetchDeviceData } = useDeviceData(isConnected);

  // ✅ FIX: Use primitive value for subscriptions
  useDeviceSubscriptions(isConnected);

  // Mutations
  const { mutate: disconnectDevice } = useDisconnectDevice();
  const { mutate: renameDevice, isPending: isRenaming } = useRenameDevice();
  const { mutate: updateFirmware, isPending: isUpdating } = useUpdateFirmware();

  // ✅ FIX: Check permissions on mount with ref guard
  useEffect(() => {
    if (hasPermissions === false && !permissionAlertShown.current) {
      permissionAlertShown.current = true;
      crossPlatformAlert(
        t("device.permissions.title", { defaultValue: "Bluetooth Permissions" }),
        t("device.permissions.message", {
          defaultValue: "This app needs Bluetooth permissions to connect to your Taykie device.",
        }),
        [{ text: "OK" }],
      );
    }

    // Reset if permissions are granted
    if (hasPermissions === true) {
      permissionAlertShown.current = false;
    }
  }, [hasPermissions, t]);

  // ✅ FIX: Check Bluetooth state with ref guard
  useEffect(() => {
    if (hasPermissions && isBluetoothEnabled === false && !bluetoothAlertShown.current) {
      bluetoothAlertShown.current = true;
      crossPlatformAlert(
        t("device.bluetooth.disabled", { defaultValue: "Bluetooth Disabled" }),
        t("device.bluetooth.enableMessage", {
          defaultValue: "Please enable Bluetooth to connect to your device.",
        }),
        [{ text: "OK" }],
      );
    }

    // Reset if Bluetooth is enabled
    if (isBluetoothEnabled === true) {
      bluetoothAlertShown.current = false;
    }
  }, [hasPermissions, isBluetoothEnabled, t]);

  // Handle device actions
  const handleAction = useCallback(
    (actionKey: DeviceActionKey) => {
      switch (actionKey) {
        case "find":
          if (!hasPermissions) {
            crossPlatformAlert(
              t("device.permissions.required", { defaultValue: "Permissions Required" }),
              t("device.permissions.bluetoothRequired", {
                defaultValue: "Bluetooth permissions are required to scan for devices.",
              }),
              [{ text: "OK" }],
            );
            return;
          }
          if (!isBluetoothEnabled) {
            crossPlatformAlert(
              t("device.bluetooth.disabled", { defaultValue: "Bluetooth Disabled" }),
              t("device.bluetooth.enableToScan", {
                defaultValue: "Please enable Bluetooth to scan for devices.",
              }),
              [{ text: "OK" }],
            );
            return;
          }
          setShowScanModal(true);
          break;

        case "update":
          if (!isConnected) {
            crossPlatformAlert(
              t("device.notConnected", { defaultValue: "Device Not Connected" }),
              t("device.connectFirst", {
                defaultValue: "Please connect to your device first.",
              }),
              [{ text: "OK" }],
            );
            return;
          }
          crossPlatformAlert(
            t("device.firmware.updateTitle", { defaultValue: "Update Firmware" }),
            t("device.firmware.updateMessage", {
              defaultValue: "This will update your device firmware. This may take several minutes.",
            }),
            [
              {
                text: t("common.cancel", { defaultValue: "Cancel" }),
                style: "cancel",
              },
              {
                text: t("device.firmware.update", { defaultValue: "Update" }),
                onPress: () => {
                  updateFirmware(undefined, {
                    onSuccess: (result) => {
                      crossPlatformAlert(
                        result.success
                          ? t("common.success", { defaultValue: "Success" })
                          : t("common.error", { defaultValue: "Error" }),
                        result.message,
                        [{ text: "OK" }],
                      );
                      if (result.success) {
                        refetchDeviceData();
                      }
                    },
                  });
                },
              },
            ],
          );
          break;

        case "rename":
          if (!isConnected) {
            crossPlatformAlert(
              t("device.notConnected", { defaultValue: "Device Not Connected" }),
              t("device.connectFirst", {
                defaultValue: "Please connect to your device first.",
              }),
              [{ text: "OK" }],
            );
            return;
          }
          // Show input dialog for new name
          Alert.prompt(
            t("device.rename.title", { defaultValue: "Rename Device" }),
            t("device.rename.message", { defaultValue: "Enter a new name for your device" }),
            [
              {
                text: t("common.cancel", { defaultValue: "Cancel" }),
                style: "cancel",
              },
              {
                text: t("common.save", { defaultValue: "Save" }),
                onPress: (newName) => {
                  if (newName?.trim()) {
                    renameDevice(newName.trim(), {
                      onSuccess: (result) => {
                        crossPlatformAlert(
                          result.success
                            ? t("common.success", { defaultValue: "Success" })
                            : t("common.error", { defaultValue: "Error" }),
                          result.message,
                          [{ text: "OK" }],
                        );
                        if (result.success) {
                          refetchDeviceData();
                        }
                      },
                    });
                  }
                },
              },
            ],
            "plain-text",
            connectedDevice?.name || "",
          );
          break;
      }
    },
    [
      hasPermissions,
      isBluetoothEnabled,
      isConnected,
      connectedDevice,
      t,
      updateFirmware,
      renameDevice,
      refetchDeviceData,
    ],
  );

  // Handle device connection success
  const handleDeviceConnected = useCallback(() => {
    setShowScanModal(false);
    crossPlatformAlert(
      t("common.success", { defaultValue: "Success" }),
      t("device.connected", { defaultValue: "Device connected successfully!" }),
      [{ text: "OK" }],
    );
  }, [t]);

  return (
    <SafeAreaScreen withBackground={false} style={styles.screen} edges={["top"]}>
      <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <AppHeader />

        {/* Connection Card */}
        <DeviceConnectionCard onFindDevice={() => setShowScanModal(true)} />

        {/* Compartments Card */}
        {isConnected && (
          <View style={styles.cardSpacing}>
            <DeviceCompartments />
          </View>
        )}

        {/* Device Actions */}
        <ThemeView
          style={styles.actionsCard as any}
          backgroundColor={theme.colors.white}
          rounded="lg"
        >
          <ThemeText variant="manrope.h4" style={styles.cardTitle}>
            {t("device.actions.title", { defaultValue: "Device Actions" })}
          </ThemeText>

          <View style={styles.actionsList}>
            {ACTIONS.map((action) => {
              // Disable update and rename if not connected
              const isDisabled =
                !isConnected && (action.key === "update" || action.key === "rename");
              const isLoading =
                (action.key === "update" && isUpdating) || (action.key === "rename" && isRenaming);

              return (
                <TouchableOpacity
                  key={action.key}
                  activeOpacity={isDisabled ? 1 : 0.7}
                  style={[styles.actionRow, isDisabled && styles.actionDisabled]}
                  onPress={() => !isDisabled && handleAction(action.key)}
                  disabled={isDisabled || isLoading}
                >
                  <View style={styles.actionLabelRow}>
                    <View style={[styles.actionIcon, isDisabled && styles.actionIconDisabled]}>
                      {action.icon === "search" && (
                        <IconSearch stroke={isDisabled ? "#CCC" : "#262520"} />
                      )}
                      {action.icon === "refresh" && (
                        <IconRefresh stroke={isDisabled ? "#CCC" : "#262520"} />
                      )}
                      {action.icon === "pencil" && (
                        <IconRemane stroke={isDisabled ? "#CCC" : "#262520"} />
                      )}
                    </View>
                    <ThemeText
                      variant="manrope.body1Bold"
                      style={[styles.actionLabel, isDisabled && styles.actionLabelDisabled]}
                    >
                      {t(`device.actions.${action.key}`, { defaultValue: action.label })}
                    </ThemeText>
                  </View>
                  <View style={styles.actionTrailing}>
                    {action.key === "find" && deviceData?.firmwareVersion && (
                      <View style={styles.actionBadge}>
                        <ThemeText variant="manrope.caption" style={styles.actionBadgeText}>
                          v{deviceData.firmwareVersion}
                        </ThemeText>
                      </View>
                    )}
                    {isLoading ? (
                      <Ionicons
                        name="hourglass"
                        size={moderateScale(20)}
                        color={theme.colors.text.secondary}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={moderateScale(20)}
                        color={isDisabled ? "#CCC" : theme.colors.text.secondary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Disconnect Button */}
          {isConnected && (
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={() => {
                crossPlatformAlert(
                  t("device.disconnect.title", { defaultValue: "Disconnect Device" }),
                  t("device.disconnect.message", {
                    defaultValue: "Are you sure you want to disconnect from your device?",
                  }),
                  [
                    {
                      text: t("common.cancel", { defaultValue: "Cancel" }),
                      style: "cancel",
                    },
                    {
                      text: t("device.disconnect.button", { defaultValue: "Disconnect" }),
                      onPress: () => disconnectDevice(),
                      style: "destructive",
                    },
                  ],
                );
              }}
              activeOpacity={0.7}
            >
              <ThemeText variant="manrope.body1Bold" style={styles.disconnectText}>
                {t("device.disconnect.button", { defaultValue: "Disconnect Device" })}
              </ThemeText>
            </TouchableOpacity>
          )}
        </ThemeView>
      </ScrollView>

      {/* Scan Modal */}
      {showScanModal && (
        <DeviceScanModal
          key="device-scan-modal"
          visible={showScanModal}
          onClose={() => setShowScanModal(false)}
          onDeviceConnected={handleDeviceConnected}
        />
      )}
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl,
    },
    cardSpacing: {
      marginTop: theme.spacing.md,
    },
    actionsCard: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.smd,
      borderRadius: theme.spacing.smd,
    },
    cardTitle: {
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
      fontFamily: fontFamily.manrope.bold,
      fontSize: 16,
    },
    actionsList: {
      gap: theme.spacing.xs,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background.default,
      borderRadius: theme.spacing.sm,
    },
    actionDisabled: {
      opacity: 0.5,
    },
    actionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.white,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.sm,
    },
    actionIconDisabled: {
      backgroundColor: theme.colors.background.default,
    },
    actionLabel: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontFamily: fontFamily.manrope.semibold,
    },
    actionLabelDisabled: {
      color: theme.colors.text.disabled,
    },
    actionTrailing: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    actionBadge: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.spacing.xs,
    },
    actionBadgeText: {
      color: theme.colors.white,
      fontSize: 12,
      fontFamily: fontFamily.manrope.semibold,
    },
    disconnectButton: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: "#FF3B30",
      borderRadius: theme.spacing.sm,
      alignItems: "center",
    },
    disconnectText: {
      color: theme.colors.white,
      fontSize: 16,
    },
  });
