"use client";

import React, { useCallback, useEffect } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { SafeAreaScreen, ThemeStatusBar, ThemeView } from "@/components";
import AppHeader from "@/components/AppHeader";
import ScheduleModals from "@/components/schedule/ScheduleModals";
import TaskItem from "@/components/schedule/TaskItem";
import Tabs from "@/components/shared/tabs/Tabs";
import { useScheduleStore } from "@/stores/scheduleStore";
import type { Theme } from "@/theme";
import { useTheme } from "@/theme";
import { addDays, format, startOfWeek } from "date-fns";
import EmptyView from "@/components/ui/empty-view";
import { TaskListSkeleton } from "@/components/schedule/TaskItemSkeleton";
import { t } from "i18next";
import { scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import InfoModal from "@/components/InfoModal";
import MedicineTaken from "@/components/schedule/MedicineTaken";
import { Schedule } from "@/types/schedule.types";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

interface DayCell {
  date: Date;
  weekday: string;
  dayNumber: string;
}

const VIEW_SEGMENTS: SegmentOption<"daily" | "weekly" | "monthly">[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

type ViewSegmentKey = "daily" | "weekly" | "monthly";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const keyExtractor = (item: Schedule) => String(item.id);

interface ScheduleRowProps {
  item: Schedule;
  statusLabel: string;
  backgroundColor?: string;
  style: StyleProp<ViewStyle>;
  onSelect: (task: Schedule) => void;
}

// Memoized so TaskItem's own React.memo isn't defeated by a fresh inline
// onPress closure on every parent render.
const ScheduleRow = React.memo(function ScheduleRow({
  item,
  statusLabel,
  backgroundColor,
  style,
  onSelect,
}: ScheduleRowProps) {
  const handlePress = useCallback(() => onSelect(item), [onSelect, item]);
  return (
    <ThemeView style={style} backgroundColor={backgroundColor}>
      <TaskItem
        id={String(item.id)}
        status={item.status ?? "upcoming"}
        statusLabel={statusLabel}
        time={item.scheduleTime ?? ""}
        title={item.product?.name ?? ""}
        onPress={handlePress}
      />
    </ThemeView>
  );
});

export const generateWeek = (reference: Date, formatStyle: string = "EE"): DayCell[] => {
  const start = startOfWeek(reference, { weekStartsOn: 1 });

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(start, index);
    return {
      date,
      weekday: format(date, formatStyle).toUpperCase(),
      dayNumber: String(index + 1),
    };
  });
};

export default function ScheduleScreen() {
  const theme = useTheme();
  const alert = useAlert();
  const weekDays = React.useMemo(() => generateWeek(new Date()), []);
  const [viewSegment, setViewSegment] = React.useState<ViewSegmentKey>("daily");
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [task, setTask] = React.useState<Schedule | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = React.useState(() => {
    const todayIndex = weekDays.findIndex(
      (day) => format(day.date, "d") === format(new Date(), "d"),
    );
    return todayIndex >= 0 ? todayIndex : 0;
  });

  const selectedDayName = format(weekDays[selectedDayIndex].date, "EEEE");

  // Destructure pagination states from your store
  // Individual selectors so unrelated store updates don't re-render the screen.
  const fetchUserSchedules = useScheduleStore((s) => s.fetchUserSchedules);
  const userSchedules = useScheduleStore((s) => s.userSchedules);
  const isLoading = useScheduleStore((s) => s.isLoading);
  const isFetchingNextPage = useScheduleStore((s) => s.isFetchingNextPage);
  const hasMore = useScheduleStore((s) => s.hasMore);

  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

  const statusLabels = React.useMemo(
    () => ({
      taken: t(LocalizedStrings.home.tasks.status.taken),
      missed: t(LocalizedStrings.home.tasks.status.missed),
      upcoming: t(LocalizedStrings.home.tasks.status.upcoming),
    }),
    [t],
  );

  const filteredSchedules = React.useMemo(() => {
    return userSchedules
      .filter((schedule) => {
        if (viewSegment === "daily") {
          return schedule.scheduleType === "daily";
        }

        if (viewSegment === "weekly") {
          return schedule.scheduleType === "weekly" && schedule.scheduleDay === selectedDayName;
        }

        if (viewSegment === "monthly") {
          return schedule.scheduleType === "monthly" && schedule.scheduleDay === null;
        }

        return false;
      })
      .sort((a, b) => (a.scheduleTime ?? "").localeCompare(b.scheduleTime ?? ""));
  }, [userSchedules, viewSegment, selectedDayName]);

  const viewSegments = React.useMemo(
    () =>
      VIEW_SEGMENTS.map((item) => ({
        key: item.key,
        label: t(`home.schedule.${item.key}`),
      })),
    [t],
  );

  const fetchSchedulesInitial = useCallback(async () => {
    try {
      await fetchUserSchedules(true);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, [fetchUserSchedules]);

  useEffect(() => {
    fetchSchedulesInitial();
  }, [fetchSchedulesInitial]);

  const handleRefresh = useCallback(async () => {
    try {
      await fetchUserSchedules(true);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, [fetchUserSchedules]);

  // Load more pagination handler
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isFetchingNextPage && !isLoading) {
      fetchUserSchedules(false);
    }
  }, [hasMore, isFetchingNextPage, isLoading, fetchUserSchedules]);

  const handleCloseTask = useCallback(() => {
    setTask(null);
  }, []);

  const handleTask = useCallback((selected: Schedule) => {
    setTask(selected);
  }, []);

  const handleSelectSegment = useCallback(
    (key: string | string[]) => setViewSegment(key as ViewSegmentKey),
    [],
  );
  const handleOpenSearch = useCallback(() => setSearchVisible(true), []);
  const handleCloseSearch = useCallback(() => setSearchVisible(false), []);

  const handleEditComplete = useCallback(
    async (updatedSchedule: Schedule) => {
      await fetchSchedulesInitial();
      setTask(updatedSchedule);
    },
    [fetchSchedulesInitial],
  );

  const renderItem = useCallback(
    ({ item }: { item: Schedule }) => (
      <ScheduleRow
        item={item}
        statusLabel={statusLabels[item.status ?? "upcoming"]}
        backgroundColor={theme.colors.white}
        style={themedStyles.cardMiddle}
        onSelect={handleTask}
      />
    ),
    [statusLabels, theme.colors.white, themedStyles.cardMiddle, handleTask],
  );

  // First load with nothing cached: show skeleton rows instead of a spinner.
  const isInitialLoading = isLoading && userSchedules.length === 0;

  const refreshControl = React.useMemo(
    () => <RefreshControl onRefresh={handleRefresh} refreshing={isLoading && !isInitialLoading} />,
    [handleRefresh, isLoading, isInitialLoading],
  );

  // --- SPLIT UI COMPONENTS ---

  const ListHeader = (
    <>
      <AppHeader />
      {task && (
        <InfoModal visible={!!task} onRequestClose={handleCloseTask}>
          <MedicineTaken
            task={task}
            onClose={handleCloseTask}
            onEditComplete={handleEditComplete}
          />
        </InfoModal>
      )}
      {/* Top of the White Card */}
      <ThemeView style={themedStyles.cardTop} backgroundColor={theme.colors.white}>
        <Tabs onSelect={handleSelectSegment} segments={viewSegments} fullWidth={false} />
        {viewSegment === "weekly" && (
          <View style={themedStyles.dateRowWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={themedStyles.dateRow}
              className="gap-0"
            >
              {weekDays.map((day, index) => {
                const isActive = index === selectedDayIndex;
                return (
                  <TouchableOpacity
                    key={day.weekday + index}
                    onPress={() => setSelectedDayIndex(index)}
                    activeOpacity={0.9}
                    style={[themedStyles.datePill, isActive && themedStyles.datePillActive]}
                  >
                    <Text
                      style={[isActive ? themedStyles.dateActive : themedStyles.dateInactive]}
                      className={` ${isActive ? "text-primary" : "text-triatry-20"} font-Manrope-Bold font-semibold text-xs leading-4`}
                    >
                      {day.weekday.slice(0, 2)}
                    </Text>
                    <Text
                      style={[isActive ? themedStyles.dateActive : themedStyles.dateInactive]}
                      className={` ${isActive ? "text-primary" : "text-triatry-20"} font-Manrope-Bold font-semibold text-xs leading-4`}
                    >
                      {day.dayNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ThemeView>
    </>
  );

  const ListFooter = (
    /* Bottom of the White Card */
    <ThemeView style={themedStyles.cardBottom} backgroundColor={theme.colors.white}>
      {isFetchingNextPage && (
        <View style={{ paddingVertical: verticalScale(8) }}>
          <TaskListSkeleton count={2} />
        </View>
      )}
    </ThemeView>
  );

  return (
    <SafeAreaScreen withBackground={false} style={themedStyles.screen} edges={["top"]}>
      <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />

      <FlatList
        showsVerticalScrollIndicator={false}
        contentContainerStyle={themedStyles.contentContainer}
        data={filteredSchedules}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        renderItem={renderItem}
        ListEmptyComponent={
          <ThemeView style={themedStyles.cardMiddle} backgroundColor={theme.colors.white}>
            {isInitialLoading ? (
              <TaskListSkeleton count={4} />
            ) : (
              <EmptyView
                showButton
                message={t(LocalizedStrings.schedule.placeHolders.empty)}
                buttonTitle={t(LocalizedStrings.schedule.create)}
                onPressButton={handleOpenSearch}
              />
            )}
          </ThemeView>
        }
      />

      <ScheduleModals visible={searchVisible} onClose={handleCloseSearch} />
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl * 2.5,
    },

    // --- SPLIT CARD STYLES TO PRESERVE UI EXACTLY ---
    cardTop: {
      marginTop: verticalScale(28),
      borderTopLeftRadius: theme.spacing.mlg,
      borderTopRightRadius: theme.spacing.mlg,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    cardMiddle: {
      paddingHorizontal: theme.spacing.md,
    },
    cardBottom: {
      borderBottomLeftRadius: theme.spacing.mlg,
      borderBottomRightRadius: theme.spacing.mlg,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    // -----------------------------------------------

    dateRowWrapper: {
      marginBottom: theme.spacing.lg,
    },
    dateRow: {
      paddingRight: theme.spacing.md,
    },
    datePill: {
      width: scale(36),
      borderRadius: theme.spacing.smd,
      backgroundColor: "rgba(0,0,0,0.05)",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xs,
      marginRight: theme.spacing.md,
    },
    datePillActive: {
      backgroundColor: theme.colors.black,
    },
    dateInactive: {
      color: theme.colors.text.secondary,
    },
    dateActive: {
      color: theme.colors.primary.main,
    },
  });
