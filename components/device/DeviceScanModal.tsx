import React, { memo, useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItem,
  Modal,
  Platform,
} from "react-native";
import { ThemeText } from "@/components/primitives";
import { useTheme, type Theme } from "@/theme";
import { TaykieDevice } from "@/services/ble/BLEService";
import { useScanDevices, useStopScan, useConnectDevice } from "@/hooks/useBLE";
import { useBLEScanning } from "@/stores/bleStore";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { moderateScale, scale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface DeviceScanModalProps {
  visible: boolean;
  onClose: () => void;
  onDeviceConnected?: () => void;
}

/**
 * DeviceScanModal Component - FIXED VERSION
 *
 * Reusable modal for scanning and connecting to BLE devices
 *
 * Features:
 * - Auto-scans when opened
 * - Shows list of found devices with RSSI
 * - Handles connection with loading states
 * - Optimized with memo and useCallback
 * - Fixed view hierarchy issues
 */
const DeviceScanModal: React.FC<DeviceScanModalProps> = memo(
  ({ visible, onClose, onDeviceConnected }) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(theme), [theme]);

    const { isScanning, scannedDevices } = useBLEScanning();
    const { mutate: startScan, isPending: isScanPending } = useScanDevices();
    const { mutate: stopScan } = useStopScan();
    const { mutate: connectDevice, isPending: isConnecting } = useConnectDevice();
    console.log("scannedDevices", scannedDevices);
    // Local state to track if modal has been shown
    const [hasScanned, setHasScanned] = useState(false);
    // Start scan when modal opens
    useEffect(() => {
      if (visible && !hasScanned) {
        setHasScanned(true);
        startScan(10000);
      } else if (!visible) {
        // Reset when modal closes
        setHasScanned(false);
        stopScan();
      }
    }, [visible, hasScanned, startScan, stopScan]);

    // Handle device connection
    const handleDevicePress = useCallback(
      (device: TaykieDevice) => {
        connectDevice(device.id, {
          onSuccess: (result) => {
            if (result.success) {
              onDeviceConnected?.();
            }
          },
        });
      },
      [connectDevice, onDeviceConnected],
    );

    // Render device item
    const renderDevice: ListRenderItem<TaykieDevice> = useCallback(
      ({ item }) => (
        <TouchableOpacity
          style={styles.deviceItem}
          onPress={() => handleDevicePress(item)}
          disabled={isConnecting}
          activeOpacity={0.7}
        >
          <View style={styles.deviceInfo}>
            <Ionicons
              name="bluetooth"
              size={moderateScale(24)}
              color={theme.colors.primary.main}
              style={styles.deviceIcon}
            />
            <View style={styles.deviceDetails}>
              <ThemeText variant="manrope.body1Bold" style={styles.deviceName}>
                {item.name || t("device.scan.unknownDevice", { defaultValue: "Unknown Device" })}
              </ThemeText>
              <ThemeText variant="manrope.caption" style={styles.deviceId}>
                {item.id}
              </ThemeText>
            </View>
          </View>
          <View style={styles.deviceRssi}>
            <ThemeText variant="manrope.caption" style={styles.rssiText}>
              {item.rssi} dBm
            </ThemeText>
            <Ionicons
              name="chevron-forward"
              size={moderateScale(20)}
              color={theme.colors.text.secondary}
            />
          </View>
        </TouchableOpacity>
      ),
      [theme, styles, handleDevicePress, isConnecting, t, scannedDevices],
    );

    // Render empty state
    const renderEmpty = useCallback(
      () => (
        <View style={styles.emptyState}>
          {isScanning ? (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary.main} />
              <ThemeText variant="manrope.body1" style={styles.emptyText}>
                {t(LocalizedStrings.device.scan.scanning, {
                  defaultValue: "Scanning for devices...",
                })}
              </ThemeText>
            </>
          ) : (
            <>
              <Ionicons
                name="bluetooth-outline"
                size={moderateScale(48)}
                color={theme.colors.text.secondary}
                style={styles.emptyIcon}
              />
              <ThemeText variant="manrope.body1" style={styles.emptyText}>
                {t(LocalizedStrings.device.scan.noDevices, { defaultValue: "No devices found" })}
              </ThemeText>
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => {
                  setHasScanned(false);
                }}
                disabled={isScanPending}
              >
                <ThemeText variant="manrope.body1Bold" style={styles.rescanText}>
                  {t(LocalizedStrings.device.scan.rescan, { defaultValue: "Scan Again" })}
                </ThemeText>
              </TouchableOpacity>
            </>
          )}
        </View>
      ),
      [theme, styles, isScanning, isScanPending, t],
    );

    // Don't render if not visible
    if (!visible) {
      return null;
    }

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
        hardwareAccelerated
      >
        <BlurView
          intensity={theme.mode === "dark" ? 40 : 50}
          tint={theme.mode === "dark" ? "dark" : "light"}
          style={styles.blurContainer}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.header}>
                  <ThemeText variant="manrope.h3" style={styles.heading}>
                    {t("device.scan.title", { defaultValue: "Find Device" })}
                  </ThemeText>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons
                      name="close"
                      size={moderateScale(24)}
                      color={theme.colors.text.primary}
                    />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={scannedDevices}
                  renderItem={renderDevice}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={renderEmpty}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                />
                {/* Content */}
                <View style={styles.container}>
                  {isConnecting && (
                    <View style={styles.connectingOverlay}>
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                      <ThemeText variant="manrope.body1" style={styles.connectingText}>
                        {t("device.scan.connecting", { defaultValue: "Connecting..." })}
                      </ThemeText>
                    </View>
                  )}

                  {scannedDevices.length > 0 && isScanning && (
                    <View style={styles.scanningIndicator}>
                      <ActivityIndicator size="small" color={theme.colors.primary.main} />
                      <ThemeText variant="manrope.caption" style={styles.scanningText}>
                        {t("device.scan.stillScanning", { defaultValue: "Still scanning..." })}
                      </ThemeText>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </BlurView>
      </Modal>
    );
  },
);

DeviceScanModal.displayName = "DeviceScanModal";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    blurContainer: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      backgroundColor: Platform.OS === "android" ? theme.colors.backdrop : "transparent",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    modalContent: {
      width: "100%",
      maxWidth: scale(500),
      maxHeight: "80%",
      backgroundColor: theme.colors.white,
      borderRadius: theme.spacing.lg,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: scale(1),
      borderBottomColor: theme.colors.border,
    },
    heading: {
      color: theme.colors.text.primary,
      flex: 1,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    container: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    listContent: {
      flexGrow: 1,
    },
    deviceItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background.default,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    deviceInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    deviceIcon: {
      marginRight: theme.spacing.md,
    },
    deviceDetails: {
      flex: 1,
    },
    deviceName: {
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    deviceId: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(12),
    },
    deviceRssi: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    rssiText: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(12),
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xxxl,
    },
    emptyIcon: {
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      color: theme.colors.text.secondary,
      textAlign: "center",
      marginTop: theme.spacing.md,
    },
    rescanButton: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.spacing.sm,
    },
    rescanText: {
      color: theme.colors.white,
    },
    connectingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.backdrop,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      borderRadius: theme.spacing.sm,
    },
    connectingText: {
      color: theme.colors.white,
      marginTop: theme.spacing.md,
    },
    scanningIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    scanningText: {
      color: theme.colors.text.secondary,
    },
  });

export default DeviceScanModal;
