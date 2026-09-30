import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { Theme, useTheme } from "@/theme";
import { moderateScale, verticalScale } from "@/utils/scale";

/** Placeholder for the three summary metric cards. */
export const MetricsSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.metricRow}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.metricCard}>
          <Skeleton width="70%" height={moderateScale(12)} />
          <Skeleton width="45%" height={moderateScale(20)} />
        </View>
      ))}
    </View>
  );
});
MetricsSkeleton.displayName = "MetricsSkeleton";

/** Placeholder for the two side-by-side chart cards (missed doses, adherence). */
export const ChartsSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.chartRow}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.chartCard}>
          <Skeleton width="70%" height={moderateScale(14)} />
          <Skeleton width="100%" height={verticalScale(150)} borderRadius={moderateScale(8)} />
          <Skeleton width="55%" height={moderateScale(12)} style={styles.centered} />
        </View>
      ))}
    </View>
  );
});
ChartsSkeleton.displayName = "ChartsSkeleton";

/** Placeholder for the suggested-adjustment tiles. */
export const SuggestionsSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.suggestionTile}>
      <Skeleton width="60%" height={moderateScale(14)} />
      <Skeleton width="80%" height={moderateScale(12)} />
    </View>
  );
});
SuggestionsSkeleton.displayName = "SuggestionsSkeleton";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    metricRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    metricCard: {
      flex: 1,
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.smd,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.spacing.smd,
      backgroundColor: theme.colors.white,
    },
    chartRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    chartCard: {
      flex: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.smd,
      borderRadius: theme.spacing.smd,
      backgroundColor: theme.colors.white,
    },
    centered: {
      alignSelf: "center",
    },
    suggestionTile: {
      gap: theme.spacing.xs,
      padding: theme.spacing.smd,
      borderRadius: theme.spacing.smd,
      backgroundColor: theme.colors.background.default,
    },
  });
