import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { Theme, useTheme } from "@/theme";
import { moderateScale, verticalScale } from "@/utils/scale";

/**
 * Placeholder for one Home-screen task row, shaped to match TaskItem (icon +
 * title/time + status badge) so the card doesn't jump when real data lands.
 */
export const TaskItemSkeleton = memo(({ isLast = false }: { isLast?: boolean }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.taskItem, !isLast && styles.taskItemSpacing]}>
      <Skeleton width={verticalScale(30)} height={verticalScale(30)} borderRadius={moderateScale(4)} />
      <View style={styles.taskContent}>
        <Skeleton width="55%" height={moderateScale(14)} />
        <Skeleton width="30%" height={moderateScale(11)} style={{ marginTop: verticalScale(6) }} />
      </View>
      <Skeleton width={verticalScale(20)} height={verticalScale(20)} borderRadius={999} />
    </View>
  );
});
TaskItemSkeleton.displayName = "TaskItemSkeleton";

/** A short run of skeleton rows, standing in for today's task list. */
export const TaskListSkeleton = memo(({ count = 3 }: { count?: number }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <TaskItemSkeleton key={index} isLast={index === count - 1} />
    ))}
  </View>
));
TaskListSkeleton.displayName = "TaskListSkeleton";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    taskItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background.default,
      borderRadius: theme.spacing.smd,
      paddingVertical: theme.spacing.smd,
      paddingHorizontal: theme.spacing.smd,
    },
    taskItemSpacing: {
      marginBottom: theme.spacing.md,
    },
    taskContent: {
      flex: 1,
    },
  });
