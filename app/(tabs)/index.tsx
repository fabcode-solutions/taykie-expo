import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import { SafeAreaScreen, ThemeStatusBar, ThemeText, ThemeView } from "@/components";
import { fontFamily, useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { Images } from "@/assets";
import Tabs from "@/components/shared/tabs/Tabs";
import AppHeader from "@/components/AppHeader";
import ScheduleModals from "@/components/schedule/ScheduleModals";
import TaskItem from "@/components/schedule/TaskItem";
import { useTranslation } from "react-i18next";
import InfoModal from "@/components/InfoModal";
import MedicineTaken from "@/components/schedule/MedicineTaken";
import { Schedule, TaskStatus } from "@/types/schedule.types";
import { useProductStore } from "@/stores/productStore";
import { useScheduleStore } from "@/stores/scheduleStore";
import EmptyView from "@/components/ui/empty-view";
import { getTimeOfDay } from "@/utils/formatter";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuthStore } from "@/stores/authStore";
import AddProductLogModal from "@/components/medication/AddProductLog";
import { useNotificationStore } from "@/stores/notificationStore";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

type SegmentKey = "morning" | "afternoon" | "evening" | "night";

export type Task = {
  id: string;
  title: string;
  time: string;
  status: TaskStatus;
  emoji: string;
};

const SEGMENT_DEFAULTS: Record<SegmentKey, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export default function HomeScreen() {
  usePushNotifications();
  const theme = useTheme();
  const alert = useAlert();
  const { t } = useTranslation();
  const todayLabel = React.useMemo(() => format(new Date(), "EEEE, MMM d"), []);
  const [task, setTask] = useState<Schedule | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [logVisible, setLogVisible] = useState(false);
  const [activeSegment, setActiveSegment] = React.useState<SegmentKey>("morning");
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);
  const { fetchPublicProducts, isLoading: loadingProducts } = useProductStore();
  const {
    fetchTodaySchedules,
    fetchUpcomingReminder,
    todaySchedules,
    upcomingReminder,
    fetchUserStreak,
    markMedicineAsTaken,
    createSnoozeForSchedule,
    isLoading,
  } = useScheduleStore();
  const { fetchNotifications } = useNotificationStore();

  const { userStreak } = useAuthStore();

  const segments = React.useMemo(
    () =>
      (Object.keys(SEGMENT_DEFAULTS) as SegmentKey[]).map((key) => ({
        key,
        label: t(`home.schedule.${key}`, { defaultValue: SEGMENT_DEFAULTS[key] }),
      })),
    [t],
  );

  const statusLabels = React.useMemo(
    () => ({
      taken: t(LocalizedStrings.home.tasks.status.taken),
      missed: t(LocalizedStrings.home.tasks.status.missed),
      upcoming: t(LocalizedStrings.home.tasks.status.upcoming),
    }),
    [t],
  );

  useEffect(() => {
    fetchTodaySchedules(activeSegment);
  }, [activeSegment]);
  const filterSchedules = useMemo(() => {
    if (!todaySchedules?.length) return [];

    return todaySchedules.filter((schedule) => {
      const times = schedule?.scheduleTime?.split(",").map((t) => t.trim());
      return times?.some((time) => getTimeOfDay(time) === activeSegment);
    });
  }, [todaySchedules, activeSegment]);

  const handleTask = useCallback((task: Schedule) => {
    setTask(task);
  }, []);

  const handleCloseTask = useCallback(() => {
    setTask(null);
  }, []);

  const loadData = useCallback(async () => {
    await Promise.allSettled([
      fetchUpcomingReminder(),
      fetchPublicProducts(),
      fetchTodaySchedules(activeSegment),
      fetchUserStreak(),
    ]);
  }, [
    fetchPublicProducts,
    fetchTodaySchedules,
    fetchUpcomingReminder,
    fetchUserStreak,
    activeSegment,
  ]);

  const initialDataFetch = useCallback(async () => {
    try {
      await fetchNotifications(true);
      await loadData();
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [fetchNotifications, loadData, t]);

  useEffect(() => {
    initialDataFetch();
  }, [initialDataFetch]);

  const handleMarkMedicineAsTaken = useCallback(async () => {
    try {
      if (upcomingReminder?.scheduleId) {
        const message = await markMedicineAsTaken(upcomingReminder?.scheduleId);
        await fetchUpcomingReminder();
        alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      }
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [upcomingReminder?.scheduleId, t]);

  const handleSnooze = useCallback(async () => {
    try {
      if (upcomingReminder?.scheduleId) {
        const message = await createSnoozeForSchedule(upcomingReminder?.scheduleId, 15);
        alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
      }
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [upcomingReminder?.scheduleId, t]);

  // Optimized: Extracted empty state component to prevent recreation
  const renderEmptyComponent = useCallback(
    () => (
      <EmptyView
        showButton
        message={t(LocalizedStrings.schedule.placeHolders.empty)}
        buttonTitle={t(LocalizedStrings.schedule.create)}
        onPressButton={() => setSearchVisible(true)}
      />
    ),
    [t],
  );

  const hasUpcomingReminder = Boolean(upcomingReminder?.scheduleId);
  const hasStreak = Boolean(userStreak && (userStreak?.currentStreak ?? 0) > 0);

  return (
    <SafeAreaScreen
      withBackground={false}
      style={themedStyles.screen}
      edges={["top"]}
      showLoader={isLoading || loadingProducts}
    >
      <ThemeStatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {/* Reverted from FlatList back to ScrollView + .map(): this screen's
          list is short (a handful of daily tasks), and FlatList here was
          confirmed — twice, on-device — to crash with the same Yoga/Fabric
          shadow-tree assertion seen elsewhere in this app, even after
          isolating the task-detail modal as a plain sibling. Virtualization
          isn't worth the crash risk for a list this size.

          Follow-up (2026-09-04): a fresh tombstone showed the same
          "YGNodeGetOwner(childYogaNode) == &yogaNode_" assertion on a build
          that should already be ScrollView-only. Root-caused this as the
          general Fabric/Yoga "ABA ownership" bug class (see
          facebook/react-native#52349) — it's triggered by shadow-tree churn
          from conditionally MOUNTING/UNMOUNTING sibling nodes next to a
          list, not by FlatList specifically. The reminder block and streak
          card below were toggling in and out of the tree entirely
          (`condition && <View>...</View>`), which changes the parent's
          child count/order on every render where the condition flips.
          Fixed by always mounting a stable wrapper for each section and
          only conditionally rendering its *inner* content, so the parent
          Yoga node's set of children stays structurally stable across
          renders. If this crash resurfaces, the next place to check is
          whether TaskItem/Tabs/ScheduleModals mount a nested FlatList of
          their own — that would reintroduce the same churn pattern from
          inside a component this screen doesn't control directly. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={themedStyles.contentContainer}
        // refreshControl={
        //   <RefreshControl onRefresh={loadData} refreshing={loadingProducts} />
        // }
      >
        <AppHeader showGreeting />
        <ThemeView style={themedStyles.card} backgroundColor={theme.colors.white}>
          <View style={themedStyles.cardHeader}>
            <ThemeText
              variant="manrope.h4"
              style={themedStyles.cardTitle}
              className="Manrope_700Bold"
            >
              {t(LocalizedStrings.home.today.title)}
            </ThemeText>
            <ThemeText variant="manrope.subtitle" style={themedStyles.cardSubtitle}>
              {todayLabel}
            </ThemeText>
          </View>
          <Tabs onSelect={(e) => setActiveSegment(e as SegmentKey)} segments={segments} />

          {todaySchedules?.length
            ? todaySchedules.map((item) => (
                <TaskItem
                  key={item.scheduleId ?? item.id}
                  id={item.scheduleId ?? item.id ?? ""}
                  status={item.status ?? "Upcoming"}
                  statusLabel={statusLabels[item.status ?? "Upcoming"]}
                  time={item.time24 ?? ""}
                  title={item.name ?? ""}
                  onPress={() => handleTask(item)}
                />
              ))
            : renderEmptyComponent()}

          {/* Stable wrapper: always mounted so the card's child list doesn't
              gain/lose a node when the reminder appears or disappears.
              Only the inner content is conditional. */}
          <View style={!hasUpcomingReminder && themedStyles.hiddenSection}>
            {hasUpcomingReminder && (
              <>
                <ThemeText variant="manrope.body1Bold" style={themedStyles.reminderTitle}>
                  {`${t(LocalizedStrings.common.take)} ${upcomingReminder?.name} ${t(LocalizedStrings.common.in)} ${upcomingReminder?.countdownLabel} `}
                </ThemeText>
                <View style={themedStyles.reminderDivider} />
                <View style={themedStyles.reminderActions}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      themedStyles.reminderButton,
                      themedStyles.reminderButtonPrimary,
                      themedStyles.reminderButtonSpacing,
                      { flex: 2 },
                    ]}
                    onPress={handleMarkMedicineAsTaken}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={moderateScale(18)}
                      color={theme.colors.success.main}
                      style={themedStyles.reminderButtonIcon}
                    />
                    <ThemeText variant="manrope.body1Bold" style={themedStyles.reminderButtonText}>
                      {t(LocalizedStrings.home.reminder.markTaken)}
                    </ThemeText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[themedStyles.reminderButton, themedStyles.reminderButtonSpacing]}
                    onPress={handleSnooze}
                  >
                    <Ionicons
                      name="time-outline"
                      size={moderateScale(18)}
                      color={theme.colors.text.secondary}
                      style={themedStyles.reminderButtonIcon}
                    />
                    <ThemeText variant="manrope.body1Bold" style={themedStyles.reminderButtonText}>
                      {t(LocalizedStrings.home.reminder.snooze)}
                    </ThemeText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={themedStyles.reminderButton}
                    onPress={() => setLogVisible(true)}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={moderateScale(18)}
                      color={theme.colors.text.secondary}
                      style={themedStyles.reminderButtonIcon}
                    />
                    <ThemeText variant="manrope.body1Bold" style={themedStyles.reminderButtonText}>
                      {t(LocalizedStrings.home.reminder.log)}
                    </ThemeText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Stable wrapper for the streak card, same rationale as above. */}
          <View style={!hasStreak && themedStyles.hiddenSection}>
            {hasStreak && (
              <LinearGradient
                colors={["#E3F4C2", "#F8F8D5"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.5, y: 1 }}
                style={themedStyles.streakCard}
              >
                <View style={themedStyles.streakContent}>
                  <ThemeText variant="manrope.body1Bold" style={themedStyles.streakTitle}>
                    {t("schedule.youAreOnStreak", { streak: userStreak?.currentStreak })}
                  </ThemeText>
                </View>
                <View style={themedStyles.streakEmojiBubble}>
                  <Image
                    style={{
                      aspectRatio: 1,
                      height: verticalScale(40),
                    }}
                    source={Images.streakArm}
                  />
                </View>
              </LinearGradient>
            )}
          </View>
        </ThemeView>
      </ScrollView>

      {task && (
        <InfoModal visible={!!task} onRequestClose={handleCloseTask}>
          <MedicineTaken
            task={task}
            onClose={handleCloseTask}
            onEditComplete={async (updatedSchedule) => {
              await loadData();
              setTask(updatedSchedule);
            }}
          />
        </InfoModal>
      )}
      <ScheduleModals visible={searchVisible} onClose={() => setSearchVisible(false)} />
      <AddProductLogModal
        scheduleId={upcomingReminder?.scheduleId}
        productName={upcomingReminder?.name}
        visible={logVisible}
        onClose={() => setLogVisible(false)}
      />
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
    card: {
      marginTop: verticalScale(28),
      paddingVertical: verticalScale(21),
      paddingHorizontal: scale(15),
      borderRadius: moderateScale(20),
    },
    cardHeader: {
      marginBottom: theme.spacing.mlg,
    },
    cardTitle: {
      fontFamily: fontFamily.manrope.bold,
      color: theme.colors.text.primary,
      fontSize: moderateScale(24),
    },
    cardSubtitle: {
      marginTop: theme.spacing.xs,
      // fontSize: moderateScale(16),
      color: theme.colors.divider,
    },
    // Collapses a stable wrapper to zero size when its conditional content
    // isn't shown, instead of unmounting the wrapper itself. Keeps the
    // parent's Yoga child count/order stable across renders.
    hiddenSection: {
      height: 0,
      overflow: "hidden",
    },
    reminderTitle: {
      lineHeight: verticalScale(50),
    },
    reminderDivider: {
      height: verticalScale(4),
      backgroundColor: theme.colors.primary.main,
      borderRadius: 999,
      marginBottom: theme.spacing.mlg,
      opacity: 1,
    },
    reminderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    reminderButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: moderateScale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.white,
    },
    reminderButtonSpacing: {
      marginRight: theme.spacing.xs,
    },
    reminderButtonPrimary: {
      borderColor: theme.colors.success.main,
    },
    reminderButtonIcon: {
      marginRight: theme.spacing.xs,
    },
    reminderButtonText: {
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.primary.dark,
    },
    streakCard: {
      borderRadius: theme.spacing.smd,
      padding: theme.spacing.md18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.spacing.mlg,
    },
    streakContent: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    streakTitle: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      marginBottom: theme.spacing.xs,
    },
    streakSubtitle: {
      color: theme.colors.text.secondary,
    },
    streakEmojiBubble: {
      alignItems: "center",
      justifyContent: "center",
    },
  });
