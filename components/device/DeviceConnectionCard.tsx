import React, { memo, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemeText, ThemeView } from "@/components/primitives";
import { useTheme, type Theme, fontFamily } from "@/theme";
import { useBLEConnection, useBLEDeviceData } from "@/stores/bleStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, verticalScale } from "@/utils/scale";

interface DeviceConnectionCardProps {
  onFindDevice?: () => void;
}

/**
 * DeviceConnectionCard Component
 *
 * Displays device connection status, battery, and sync information
 *
 * Features:
 * - Real-time connection status
 * - Battery level with visual indicator
 * - Last sync timestamp
 * - Find device action
 * - Optimized with memo
 *
 * Usage:
 * ```tsx
 * <DeviceConnectionCard
 *   onFindDevice={() => {
 *     // Open scan modal
 *   }}
 * />
 * ```
 */
const DeviceConnectionCard: React.FC<DeviceConnectionCardProps> = memo(({ onFindDevice }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { connectedDevice, connectionStatus } = useBLEConnection();
  const { batteryLevel, lastSync } = useBLEDeviceData();

  // Format last sync time
  const formattedLastSync = useMemo(() => {
    if (!lastSync) return t("device.connection.neverSynced", { defaultValue: "Never" });

    const now = new Date();
    const syncDate = new Date(lastSync);
    const diffInHours = Math.abs(now.getTime() - syncDate.getTime()) / 36e5;

    if (diffInHours < 24) {
      return `Today, ${format(syncDate, "h:mm a")}`;
    }
    return format(syncDate, "MMM d, h:mm a");
  }, [lastSync, t]);

  // Battery percentage
  const batteryPercentage = batteryLevel ?? 0;
  const batteryColor = useMemo(() => {
    if (batteryPercentage > 50) return "#47D257";
    if (batteryPercentage > 20) return "#FFA500";
    return "#FF3B30";
  }, [batteryPercentage]);

  // Connection status
  const isConnected = connectionStatus === "connected";
  const statusText = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return t(LocalizedStrings.device.connection.online, { defaultValue: "Online" });
      case "connecting":
        return t(LocalizedStrings.device.connection.connecting, { defaultValue: "Connecting..." });
      default:
        return t(LocalizedStrings.device.connection.offline, { defaultValue: "Offline" });
    }
  }, [connectionStatus, t]);

  const statusColor = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return "#47D257";
      case "connecting":
        return "#FFA500";
      default:
        return "#FF3B30";
    }
  }, [connectionStatus]);

  return (
    <ThemeView style={styles.card} backgroundColor={theme.colors.white} rounded="lg">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="bluetooth" size={moderateScale(16)} color="#0095FF" />
        </View>
        <ThemeText variant="manrope.h4" style={styles.title}>
          {t("device.connection.title", { defaultValue: "Connection" })}
        </ThemeText>
        {!isConnected && (
          <TouchableOpacity onPress={onFindDevice} style={styles.findButton} activeOpacity={0.7}>
            <ThemeText variant="manrope.caption" style={styles.findText}>
              {t("device.connection.find", { defaultValue: "Find Device" })}
            </ThemeText>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Connection Status */}
        <View style={styles.stat}>
          <ThemeText variant="manrope.caption" style={styles.statLabel}>
            {t("device.connection.status", { defaultValue: "Status" })}
          </ThemeText>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <ThemeText
              variant="manrope.body1Bold"
              style={[styles.statValue, { color: statusColor }]}
            >
              {statusText}
            </ThemeText>
          </View>
        </View>

        {/* Battery */}
        <View style={styles.stat}>
          <ThemeText variant="manrope.caption" style={styles.statLabel}>
            {t("device.connection.battery", { defaultValue: "Battery" })}
          </ThemeText>
          <View style={styles.batteryContainer}>
            <View style={styles.batteryTrack}>
              <View
                style={[
                  styles.batteryFill,
                  { width: `${batteryPercentage}%`, backgroundColor: batteryColor },
                ]}
              />
            </View>
            <ThemeText variant="manrope.caption" style={styles.batteryText}>
              {batteryPercentage}%
            </ThemeText>
          </View>
        </View>

        {/* Last Sync */}
        <View style={styles.stat}>
          <ThemeText variant="manrope.caption" style={styles.statLabel}>
            {t("device.connection.lastSync", { defaultValue: "Last Sync" })}
          </ThemeText>
          <ThemeText variant="manrope.body1Bold" style={styles.statValue}>
            {formattedLastSync}
          </ThemeText>
        </View>
      </View>
    </ThemeView>
  );
});

DeviceConnectionCard.displayName = "DeviceConnectionCard";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.smd,
      borderRadius: theme.spacing.smd,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    iconContainer: {
      aspectRatio: 1,
      height: verticalScale(24),
      borderRadius: moderateScale(4),
      backgroundColor: "rgba(0, 149, 255, 0.10)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.sm,
    },
    title: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(16),
      flex: 1,
    },
    findButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary.main,
      borderRadius: theme.spacing.xs,
    },
    findText: {
      color: theme.colors.white,
      fontSize: moderateScale(12),
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    stat: {
      flex: 1,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.background.default,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    statLabel: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.semiBold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    statValue: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontFamily: fontFamily.manrope.bold,
      textAlign: "center",
      marginTop: theme.spacing.xs,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    statusDot: {
      aspectRatio: 1,
      height: verticalScale(8),
      borderRadius: moderateScale(4),
    },
    batteryContainer: {
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    batteryTrack: {
      width: "100%",
      height: verticalScale(16),
      borderRadius: moderateScale(5),
      backgroundColor: "rgba(0,0,0,0.08)",
      overflow: "hidden",
    },
    batteryFill: {
      height: "100%",
    },
    batteryText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.bold,
    },
  });

export default DeviceConnectionCard;
