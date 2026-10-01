import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

/** Placeholder shaped like CommentItem: avatar + name + time, then indented text lines. */
const CommentSkeletonRow = memo(({ wide }: { wide: boolean }) => (
  <View style={styles.row}>
    <View style={styles.header}>
      <Skeleton width={verticalScale(24)} height={verticalScale(24)} borderRadius={999} />
      <Skeleton width="30%" height={moderateScale(12)} />
    </View>
    <View style={styles.body}>
      <Skeleton width={wide ? "90%" : "70%"} height={moderateScale(12)} />
      {wide && <Skeleton width="55%" height={moderateScale(12)} style={styles.line} />}
    </View>
  </View>
));
CommentSkeletonRow.displayName = "CommentSkeletonRow";

/** A short run of comment placeholders for the first load / next page of comments. */
export const CommentListSkeleton = memo(({ count = 5 }: { count?: number }) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, index) => (
      <CommentSkeletonRow key={index} wide={index % 2 === 0} />
    ))}
  </View>
));
CommentListSkeleton.displayName = "CommentListSkeleton";

const styles = StyleSheet.create({
  list: {
    gap: verticalScale(16),
  },
  row: {
    gap: verticalScale(8),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  body: {
    marginLeft: scale(30),
    paddingRight: scale(24),
  },
  line: {
    marginTop: verticalScale(6),
  },
});
