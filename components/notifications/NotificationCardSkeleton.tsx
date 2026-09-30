import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

/** Placeholder shaped like NotificationCard: icon circle + type / title / message / time. */
export const NotificationCardSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Skeleton width={verticalScale(40)} height={verticalScale(40)} borderRadius={999} />
      <View style={styles.text}>
        <Skeleton width="30%" height={moderateScale(12)} />
        <Skeleton width="65%" height={moderateScale(15)} />
        <Skeleton width="90%" height={moderateScale(12)} />
        <Skeleton width="25%" height={moderateScale(12)} />
      </View>
    </View>
  );
});
NotificationCardSkeleton.displayName = "NotificationCardSkeleton";

/** A run of NotificationCardSkeleton rows, spaced like the real list. */
export const NotificationListSkeleton = memo(({ count = 5 }: { count?: number }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <NotificationCardSkeleton key={index} />
      ))}
    </View>
  );
});
NotificationListSkeleton.displayName = "NotificationListSkeleton";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      gap: scale(16),
      borderRadius: moderateScale(12),
      backgroundColor: theme.colors.white,
      padding: verticalScale(16),
      paddingBottom: verticalScale(32),
    },
    text: {
      flex: 1,
      gap: verticalScale(8),
    },
    list: {
      gap: verticalScale(15),
    },
  });
