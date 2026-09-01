import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemeText } from "@/components";
import IconCircleTick from "@/components/icons/IconCircleTick";
import IconMissed from "@/components/icons/IconMissed";
import IconUpcoming from "@/components/icons/IconUpcoming";
import IconProduct from "@/components/icons/IconProduct";
import { useTheme, fontFamily } from "@/theme";
import type { Theme } from "@/theme";
import { TaskStatus } from "@/types/schedule.types";
import { moderateScale, verticalScale } from "@/utils/scale";

interface TaskItemProps {
  id: string;
  title: string | string[];
  time: string;
  status: TaskStatus;
  statusLabel: string;
  isLast?: boolean;
  onPress?: () => void;
}

/**
 * Renders a single task row with title, time, and status icon.
 */
const TaskItem: React.FC<TaskItemProps> = ({
  title,
  time,
  status,
  statusLabel,
  isLast = false,
  onPress,
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const renderStatusIcon = () => {
    switch (status) {
      case "taken":
        return <IconCircleTick style={styles.icon} />;
      case "missed":
        return <IconMissed style={styles.icon} />;
      case "upcoming":
        return <IconUpcoming style={styles.icon} />;
      default:
        return null;
    }
  };

  const times = time.split(", ");
  const timesString = times.length > 1 ? times.map((time) => time).join(", ") : time;
  const titleString = Array.isArray(title) ? title.join(", ") : (title ?? "");

  function convertToAmPm(time24?: string) {
    if (!time24 || typeof time24 !== "string" || !time24.includes(":")) {
      return "--:--";
    }

    let [hours, minutes] = time24.split(":");

    const h = parseInt(hours, 10);
    if (isNaN(h)) return "--:--";

    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;

    return `${formattedHours}:${minutes} ${ampm}`;
  }

  return (
    <Pressable
      style={[styles.taskItem, !isLast && styles.taskItemSpacing]}
      onPress={() => onPress?.()}
    >
      {/* Left icon */}
      <View style={styles.taskIcon}>
        <IconProduct />
      </View>

      {/* Task content */}
      <View style={styles.taskContent}>
        <ThemeText variant="manrope.body1Bold" style={styles.taskTitle}>
          {titleString}
        </ThemeText>
        <ThemeText variant="manrope.caption" style={styles.taskTime}>
          {timesString}
        </ThemeText>
      </View>

      {/* Status badge */}
      <View style={styles.statusBadge}>
        {renderStatusIcon()}
        <ThemeText variant="manrope.caption" style={styles.statusText}>
          {statusLabel}
        </ThemeText>
      </View>
    </Pressable>
  );
};

export default TaskItem;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    taskItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background.default,
      borderRadius: theme.spacing.smd,
      paddingVertical: theme.spacing.smd,
      paddingHorizontal: theme.spacing.smd,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: verticalScale(8) },
      shadowOpacity: 0.05,
      shadowRadius: moderateScale(12),
      elevation: 0,
    },
    taskItemSpacing: {
      marginBottom: theme.spacing.md,
    },
    taskIcon: {
      aspectRatio: 1,
      height: verticalScale(30),
      borderRadius: moderateScale(4),
      backgroundColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
      marginRight: theme.spacing.md,
    },
    taskContent: {
      flex: 1,
    },
    taskTitle: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      lineHeight: verticalScale(22),
      color: theme.colors.text.primary,
    },
    taskTime: {
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      fontSize: moderateScale(12),
      lineHeight: verticalScale(16),
      marginTop: verticalScale(3),
      color: theme.colors.divider,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    statusText: {
      color: theme.colors.slateCharcoal,
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      fontSize: moderateScale(12),
    },
    icon: {
      aspectRatio: 1,
      height: verticalScale(20),
    },
  });
