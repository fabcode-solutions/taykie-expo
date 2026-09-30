import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

/** Placeholder for one GroupCard / recommended-group row (avatar, name, meta, action). */
export const GroupCardSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Skeleton width={verticalScale(40)} height={verticalScale(40)} borderRadius={999} />
      <View style={styles.cardText}>
        <Skeleton width="55%" height={moderateScale(14)} />
        <Skeleton width="80%" height={moderateScale(12)} style={styles.gapTop} />
      </View>
      <Skeleton width={scale(56)} height={verticalScale(24)} borderRadius={moderateScale(50)} />
    </View>
  );
});
GroupCardSkeleton.displayName = "GroupCardSkeleton";

/** A short run of GroupCardSkeleton rows, spaced like the real group lists. */
export const GroupListSkeleton = memo(({ count = 2 }: { count?: number }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <GroupCardSkeleton key={index} />
      ))}
    </View>
  );
});
GroupListSkeleton.displayName = "GroupListSkeleton";

/** Placeholder for the horizontal friend-picker on the create-group screen. */
export const FriendListSkeleton = memo(({ count = 4 }: { count?: number }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.friendRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.friend}>
          <Skeleton width={verticalScale(36)} height={verticalScale(36)} borderRadius={999} />
          <Skeleton width={scale(48)} height={moderateScale(12)} />
        </View>
      ))}
    </View>
  );
});
FriendListSkeleton.displayName = "FriendListSkeleton";

/** Placeholder for the body of the single-group screen (below the hero image). */
export const GroupDetailsSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View>
      <View style={styles.titleRow}>
        <Skeleton width="50%" height={moderateScale(20)} />
        <Skeleton width={scale(36)} height={moderateScale(14)} />
      </View>
      <Skeleton width="95%" height={moderateScale(13)} style={styles.gapTopLg} />
      <Skeleton width="70%" height={moderateScale(13)} style={styles.gapTop} />
      <Skeleton width="45%" height={moderateScale(14)} style={styles.gapTopLg} />
      <View style={styles.infoRow}>
        <Skeleton width="50%" height={moderateScale(14)} />
        <Skeleton width={scale(84)} height={verticalScale(32)} borderRadius={moderateScale(50)} />
      </View>
      <Skeleton
        width="100%"
        height={verticalScale(120)}
        borderRadius={moderateScale(10)}
        style={styles.gapTopLg}
      />
    </View>
  );
});
GroupDetailsSkeleton.displayName = "GroupDetailsSkeleton";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      padding: verticalScale(10),
      paddingRight: scale(16),
    },
    cardText: {
      flex: 1,
    },
    list: {
      gap: verticalScale(10),
    },
    gapTop: {
      marginTop: verticalScale(6),
    },
    gapTopLg: {
      marginTop: verticalScale(15),
    },
    friendRow: {
      flexDirection: "row",
      gap: scale(10),
    },
    friend: {
      alignItems: "center",
      gap: verticalScale(6),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      padding: verticalScale(8),
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: verticalScale(15),
    },
  });
