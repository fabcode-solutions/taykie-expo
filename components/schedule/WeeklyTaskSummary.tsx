import React, { memo } from "react";
import { View, StyleSheet, FlatList, ListRenderItem } from "react-native";
import { ThemeText } from "@/components";
import { useTheme, type Theme } from "@/theme";
import { WeeklyTaskSummary, Task } from "@/types/schedule.types";
import TaskItem from "./TaskItem";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

interface WeeklyTaskSummaryProps {
  weekData: WeeklyTaskSummary[];
  onTaskStatusChange?: (taskId: string, status: "taken" | "missed" | "upcoming") => void;
  onTaskPress?: (task: Task) => void;
}

interface DayHeaderProps {
  date: string;
  completedCount: number;
  totalCount: number;
  completionRate: number;
}

const DayHeader = memo<DayHeaderProps>(({ date, completedCount, totalCount, completionRate }) => {
  const theme = useTheme();
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

  const dateObj = parseISO(date);
  const dayName = format(dateObj, "EEEE");
  const dayDate = format(dateObj, "MMM d");

  return (
    <View style={themedStyles.dayHeader}>
      <View style={themedStyles.dayInfo}>
        <ThemeText variant="manrope.body1Bold" style={themedStyles.dayName}>
          {dayName}
        </ThemeText>
        <ThemeText variant="manrope.caption" style={themedStyles.dayDate}>
          {dayDate}
        </ThemeText>
      </View>

      <View style={themedStyles.progressContainer}>
        <View style={themedStyles.progressBar}>
          <View
            style={[
              themedStyles.progressFill,
              {
                width: `${completionRate}%`,
                backgroundColor:
                  completionRate === 100
                    ? theme.colors.success.main
                    : completionRate >= 50
                      ? theme.colors.primary.main
                      : theme.colors.warning.main,
              },
            ]}
          />
        </View>
        <ThemeText variant="manrope.caption" style={themedStyles.progressText}>
          {completedCount}/{totalCount}
        </ThemeText>
      </View>
    </View>
  );
});

DayHeader.displayName = "DayHeader";

const WeeklyTaskSummaryComponent = memo<WeeklyTaskSummaryProps>(
  ({ weekData, onTaskStatusChange, onTaskPress }) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

    const renderDaySection: ListRenderItem<WeeklyTaskSummary> = React.useCallback(
      ({ item }) => (
        <View style={themedStyles.daySection}>
          <DayHeader
            date={item.date}
            completedCount={item.completedCount}
            totalCount={item.totalCount}
            completionRate={item.completionRate}
          />

          <View style={themedStyles.tasksContainer}>
            {item.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={onTaskStatusChange}
                onPress={onTaskPress}
                compact
              />
            ))}

            {item.tasks.length === 0 && (
              <View style={themedStyles.emptyState}>
                <ThemeText variant="manrope.caption" style={themedStyles.emptyText}>
                  {t("schedule.weekly.noTasks", { defaultValue: "No tasks scheduled" })}
                </ThemeText>
              </View>
            )}
          </View>
        </View>
      ),
      [onTaskStatusChange, onTaskPress, themedStyles, t],
    );

    const keyExtractor = React.useCallback((item: WeeklyTaskSummary) => item.date, []);

    const getItemLayout = React.useCallback(
      (_: any, index: number) => ({
        length: 120, // Approximate height
        offset: 120 * index,
        index,
      }),
      [],
    );

    if (weekData.length === 0) {
      return (
        <View style={themedStyles.emptyWeek}>
          <ThemeText variant="manrope.body1" style={themedStyles.emptyWeekText}>
            {t("schedule.weekly.noData", { defaultValue: "No tasks scheduled for this week" })}
          </ThemeText>
        </View>
      );
    }

    return (
      <FlatList
        data={weekData}
        renderItem={renderDaySection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={themedStyles.listContainer}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={7}
        windowSize={7}
      />
    );
  },
);

WeeklyTaskSummaryComponent.displayName = "WeeklyTaskSummary";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    listContainer: {
      paddingBottom: theme.spacing.md,
    },
    daySection: {
      marginBottom: theme.spacing.lg,
    },
    dayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.background.elevated,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    dayInfo: {
      flex: 1,
    },
    dayName: {
      color: theme.colors.text.primary,
      marginBottom: verticalScale(2),
    },
    dayDate: {
      color: theme.colors.text.secondary,
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      minWidth: scale(80),
    },
    progressBar: {
      height: verticalScale(6),
      backgroundColor: theme.colors.background.elevated,
      borderRadius: moderateScale(3),
      marginRight: theme.spacing.sm,
      flex: 1,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: moderateScale(3),
    },
    progressText: {
      color: theme.colors.text.secondary,
      fontSize: moderateScale(11),
      fontWeight: "600",
      minWidth: scale(30),
      textAlign: "right",
    },
    tasksContainer: {
      paddingHorizontal: theme.spacing.xs,
    },
    emptyState: {
      paddingVertical: theme.spacing.lg,
      alignItems: "center",
    },
    emptyText: {
      color: theme.colors.text.secondary,
      fontStyle: "italic",
    },
    emptyWeek: {
      paddingVertical: theme.spacing.xxxl,
      alignItems: "center",
    },
    emptyWeekText: {
      color: theme.colors.text.secondary,
      textAlign: "center",
    },
  });

export default WeeklyTaskSummaryComponent;
