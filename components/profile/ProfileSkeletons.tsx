import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

/** Placeholder for the public-profile header (avatar, stats, name, bio, meta, follow button). */
export const PublicProfileHeaderSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.headerWrap}>
      <View style={styles.heroRow}>
        <Skeleton width={verticalScale(80)} height={verticalScale(80)} borderRadius={999} />
        <View style={styles.statsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.stat}>
              <Skeleton width={scale(32)} height={moderateScale(16)} />
              <Skeleton width={scale(52)} height={moderateScale(12)} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.lines}>
        <Skeleton width="45%" height={moderateScale(16)} />
        <Skeleton width="30%" height={moderateScale(12)} />
      </View>
      <View style={styles.lines}>
        <Skeleton width="90%" height={moderateScale(13)} />
        <Skeleton width="60%" height={moderateScale(13)} />
      </View>
      <Skeleton width="100%" height={verticalScale(44)} borderRadius={moderateScale(10)} />
    </View>
  );
});
PublicProfileHeaderSkeleton.displayName = "PublicProfileHeaderSkeleton";

/** Placeholder for one follower/following row (avatar, name, action pill). */
export const UserRowSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.userRow}>
      <View style={styles.userLeft}>
        <Skeleton width={verticalScale(50)} height={verticalScale(50)} borderRadius={999} />
        <Skeleton width={scale(90)} height={moderateScale(14)} />
      </View>
      <Skeleton width={scale(84)} height={verticalScale(36)} borderRadius={moderateScale(70)} />
    </View>
  );
});
UserRowSkeleton.displayName = "UserRowSkeleton";

export const UserListSkeleton = memo(({ count = 5 }: { count?: number }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <UserRowSkeleton key={index} />
    ))}
  </View>
));
UserListSkeleton.displayName = "UserListSkeleton";

/** Placeholder for one row of the logs list (date, note, schedule name + remove button). */
export const LogRowSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.cardText}>
        <Skeleton width="35%" height={moderateScale(12)} />
        <Skeleton width="80%" height={moderateScale(14)} />
        <Skeleton width="50%" height={moderateScale(12)} />
      </View>
      <Skeleton width={scale(64)} height={verticalScale(28)} borderRadius={moderateScale(6)} />
    </View>
  );
});
LogRowSkeleton.displayName = "LogRowSkeleton";

/** Placeholder for one product row (name + edit/delete buttons). */
export const ProductRowSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Skeleton width="50%" height={moderateScale(14)} />
      <View style={styles.actions}>
        <Skeleton width={scale(52)} height={verticalScale(28)} borderRadius={moderateScale(6)} />
        <Skeleton
          width={verticalScale(28)}
          height={verticalScale(28)}
          borderRadius={moderateScale(6)}
        />
      </View>
    </View>
  );
});
ProductRowSkeleton.displayName = "ProductRowSkeleton";

/** A run of card-style skeleton rows spaced like the logs / products lists. */
export const CardListSkeleton = memo(
  ({ variant, count = 4 }: { variant: "log" | "product"; count?: number }) => {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const Row = variant === "log" ? LogRowSkeleton : ProductRowSkeleton;

    return (
      <View style={styles.cardList}>
        {Array.from({ length: count }).map((_, index) => (
          <Row key={index} />
        ))}
      </View>
    );
  },
);
CardListSkeleton.displayName = "CardListSkeleton";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerWrap: {
      gap: verticalScale(24),
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(20),
    },
    statsRow: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-around",
    },
    stat: {
      alignItems: "center",
      gap: verticalScale(6),
    },
    lines: {
      gap: verticalScale(8),
    },
    userRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: verticalScale(20),
    },
    userLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
    },
    card: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: scale(10),
      padding: verticalScale(20),
      backgroundColor: theme.colors.background.elevated,
    },
    cardText: {
      flex: 1,
      gap: verticalScale(8),
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: verticalScale(8),
    },
    cardList: {
      gap: verticalScale(16),
    },
  });
