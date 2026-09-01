import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeText, ThemeView } from "@/components/primitives";
import { useTheme, type Theme, fontFamily } from "@/theme";
import { useBLEDeviceData } from "@/stores/bleStore";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { moderateScale, verticalScale } from "@/utils/scale";

/**
 * DeviceCompartments Component
 *
 * Displays visual representation of device compartment status
 *
 * Compartment States:
 * - 0 = Empty (gray)
 * - 1 = Filled (blue)
 * - 2 = Active/Recently Opened (green)
 *
 * Features:
 * - Real-time compartment status from BLE
 * - Visual grid layout
 * - Color-coded states
 * - Last opened timestamp
 * - Optimized with memo
 *
 * Usage:
 * ```tsx
 * <DeviceCompartments />
 * ```
 */
const DeviceCompartments: React.FC = memo(() => {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { compartmentStatus, lastSync } = useBLEDeviceData();

  // Default to 6 empty compartments if no data
  const compartments = useMemo(() => {
    if (!compartmentStatus || compartmentStatus.length !== 6) {
      return Array.from({ length: 6 }, () => 0);
    }
    return compartmentStatus;
  }, [compartmentStatus]);

  // Get compartment color based on state
  const getCompartmentColor = (state: number) => {
    switch (state) {
      case 2: // Active/Opened
        return "#47D257";
      case 1: // Filled
        return theme.colors.primary.main;
      case 0: // Empty
      default:
        return theme.colors.text.disabled;
    }
  };

  // Format last opened time
  const lastOpenedText = useMemo(() => {
    if (!lastSync) {
      return t("device.compartments.noActivity", { defaultValue: "No recent activity" });
    }

    const syncDate = new Date(lastSync);
    return t("device.compartments.lastOpened", {
      defaultValue: `Last opened ${format(syncDate, "h:mm a")}`,
    });
  }, [lastSync, t]);

  // Count compartments by state
  const stats = useMemo(() => {
    const filled = compartments.filter((s) => s === 1).length;
    const active = compartments.filter((s) => s === 2).length;
    const empty = compartments.filter((s) => s === 0).length;
    return { filled, active, empty };
  }, [compartments]);

  return (
    <ThemeView style={styles.card} backgroundColor={theme.colors.white} rounded="lg">
      <View style={styles.header}>
        <ThemeText variant="manrope.h4" style={styles.title}>
          {t("device.compartments.title", { defaultValue: "Compartments" })}
        </ThemeText>
        <View style={styles.badge}>
          <ThemeText variant="manrope.caption" style={styles.badgeText}>
            {stats.filled + stats.active}/6
            {t("device.compartments.filled", { defaultValue: "filled" })}
          </ThemeText>
        </View>
      </View>

      {/* Compartment Grid */}
      <View style={styles.grid}>
        {compartments.map((state, index) => (
          <View
            key={`compartment-${index}`}
            style={[styles.compartment, { backgroundColor: getCompartmentColor(state) }]}
          >
            <ThemeText variant="manrope.caption" style={styles.compartmentNumber}>
              {index + 1}
            </ThemeText>
          </View>
        ))}
      </View>

      {/* Status Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary.main }]} />
          <ThemeText variant="manrope.caption" style={styles.legendText}>
            {t("device.compartments.filled", { defaultValue: "Filled" })}
          </ThemeText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#47D257" }]} />
          <ThemeText variant="manrope.caption" style={styles.legendText}>
            {t("device.compartments.active", { defaultValue: "Active" })}
          </ThemeText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.text.disabled }]} />
          <ThemeText variant="manrope.caption" style={styles.legendText}>
            {t("device.compartments.empty", { defaultValue: "Empty" })}
          </ThemeText>
        </View>
      </View>

      {/* Last Opened */}
      <ThemeText variant="manrope.caption" style={styles.lastOpened}>
        {lastOpenedText}
      </ThemeText>
    </ThemeView>
  );
});

DeviceCompartments.displayName = "DeviceCompartments";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.smd,
      borderRadius: theme.spacing.smd,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    title: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(16),
    },
    badge: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.background.default,
      borderRadius: theme.spacing.xs,
    },
    badgeText: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.semiBold,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    compartment: {
      width: "30%",
      aspectRatio: 1,
      borderRadius: theme.spacing.sm,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: verticalScale(2) },
      shadowOpacity: 0.1,
      shadowRadius: moderateScale(4),
      elevation: 2,
    },
    compartmentNumber: {
      color: theme.colors.white,
      fontSize: moderateScale(18),
      fontFamily: fontFamily.manrope.bold,
    },
    legend: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: theme.spacing.md,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    legendDot: {
      aspectRatio: 1,
      height: verticalScale(8),
      borderRadius: 999,
    },
    legendText: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(11),
    },
    lastOpened: {
      color: theme.colors.text.secondary,
      textAlign: "center",
      fontSize: moderateScale(12),
      marginTop: theme.spacing.sm,
    },
  });

export default DeviceCompartments;
