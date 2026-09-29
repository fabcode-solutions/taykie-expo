import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

/**
 * Placeholder for one feed post, shaped to roughly match PostCard's layout
 * (avatar + name row, two text lines, an image block, an action row) so the
 * feed doesn't jump when real content lands. Shown in place of the
 * full-screen Loader for a cold/first load — see community.tsx.
 */
export const PostCardSkeleton = memo(() => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={verticalScale(50)} height={verticalScale(50)} borderRadius={999} />
        <View style={styles.headerText}>
          <Skeleton width="40%" height={moderateScale(13)} />
          <Skeleton width="25%" height={moderateScale(11)} style={{ marginTop: verticalScale(6) }} />
        </View>
      </View>

      <Skeleton width="90%" height={moderateScale(13)} style={styles.line} />
      <Skeleton width="60%" height={moderateScale(13)} style={styles.line} />

      <Skeleton width="100%" height={moderateScale(180)} style={styles.image} />

      <View style={styles.actions}>
        <Skeleton width={scale(40)} height={moderateScale(20)} />
        <Skeleton width={scale(40)} height={moderateScale(20)} />
        <Skeleton width={scale(40)} height={moderateScale(20)} />
      </View>
    </View>
  );
});
PostCardSkeleton.displayName = "PostCardSkeleton";

/** A short run of skeleton cards, standing in for a fresh feed page. */
export const PostFeedSkeleton = memo(({ count = 3 }: { count?: number }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <PostCardSkeleton key={index} />
    ))}
  </View>
));
PostFeedSkeleton.displayName = "PostFeedSkeleton";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(12),
      padding: verticalScale(14),
      marginBottom: verticalScale(14),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      marginBottom: verticalScale(12),
    },
    headerText: {
      flex: 1,
    },
    line: {
      marginBottom: verticalScale(8),
    },
    image: {
      borderRadius: moderateScale(8),
      marginTop: verticalScale(4),
      marginBottom: verticalScale(10),
    },
    actions: {
      flexDirection: "row",
      gap: scale(20),
    },
  });
