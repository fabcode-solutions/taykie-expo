import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Button } from "@/components/ui/button";
import Skeleton from "@/components/ui/Skeleton";
import Switch from "@/components/ui/Switch";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useBLEConnection, useBLEStore, scheduleTimeKey } from "@/stores/bleStore";
import { useScheduleStore } from "@/stores/scheduleStore";
import { Schedule } from "@/types/schedule.types";
import { SCHEDULE_SLOT_COUNT } from "@/services/ble/TaykieProtocol";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";
import { formatTimeAmPm } from "@/utils/formatter";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

function scheduleId(schedule: Schedule): string | null {
  return schedule.scheduleId ?? schedule.id ?? null;
}

function scheduleTimes(schedule: Schedule): string[] {
  return (schedule.scheduleTime ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function scheduleFrequencyLabel(schedule: Schedule): string {
  return schedule.scheduleType === "daily"
    ? t(LocalizedStrings.device.days.everyDay)
    : schedule.scheduleType === "weekly"
      ? `${t(LocalizedStrings.common.Every)} ${schedule.scheduleDay ?? t(LocalizedStrings.device.sync.week)}`
      : t(LocalizedStrings.home.schedule.monthly);
}

interface ScheduleCardProps {
  theme: Theme;
  schedule: Schedule;
  // Monthly (ineligible) schedules render read-only, with no per-time switch.
  selectable?: boolean;
  isTimeSelected?: (time: string) => boolean;
  onToggleTime?: (time: string) => void;
}

// Renders every comma-separated time on its own row, each with its own
// switch, instead of collapsing them into one "07:30, 20:00" string toggled
// all-or-nothing — a twice (or more) daily schedule can have just one of
// its times synced to the device.
function ScheduleCard({ theme, schedule, selectable = false, isTimeSelected, onToggleTime }: ScheduleCardProps) {
  const styles = useMemo(() => createCardStyles(theme), [theme]);
  const times = scheduleTimes(schedule);
  const frequency = scheduleFrequencyLabel(schedule);
  const displayTimes = times.length > 0 ? times : ["--"];

  return (
    <View style={styles.card}>
      <ThemeText variant="manrope.body1Bold" style={styles.cardHeading}>
        {schedule.name}
      </ThemeText>
      {displayTimes.map((time, index) => {
        const isSelected = selectable ? (isTimeSelected?.(time) ?? false) : false;
        const timeRow = (
          <ThemeText variant="manrope.body2" style={styles.cardTime}>
            {formatTimeAmPm(time)} · {frequency}
          </ThemeText>
        );
        if (!selectable) {
          return (
            <View key={`${time}-${index}`} style={styles.timeRow}>
              {timeRow}
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={`${time}-${index}`}
            style={styles.timeRow}
            onPress={() => onToggleTime?.(time)}
            activeOpacity={0.7}
          >
            {timeRow}
            <Switch
              style={styles.switch}
              trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
              onPress={() => onToggleTime?.(time)}
              value={isSelected}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ScheduleCardSkeleton({ theme }: { theme: Theme }) {
  const styles = useMemo(() => createCardStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <Skeleton width="55%" height={verticalScale(16)} style={{ marginBottom: verticalScale(8) }} />
      <View style={styles.timeRow}>
        <Skeleton width="60%" height={verticalScale(13)} />
        <Skeleton width={scale(30)} height={verticalScale(16)} borderRadius={999} />
      </View>
    </View>
  );
}

const createCardStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: verticalScale(10),
      paddingRight: scale(14),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      borderColor: theme.colors.divider,
      borderWidth: scale(1),
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: verticalScale(4),
    },
    cardHeading: {
      color: theme.colors.text.primary,
      marginBottom: verticalScale(2),
    },
    cardTime: {
      color: theme.colors.primary.dark,
      flexShrink: 1,
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
  });

export default function ScheduleSyncScreen() {
  const theme = useTheme();
  const router = useRouter();
  const alert = useAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { connectionStatus } = useBLEConnection();
  const { syncSchedulesToDevice } = useBLEStore();
  const syncedTimeKeys = useBLEStore((s) => s.syncedTimeKeys);
  const { userSchedules, fetchUserSchedules, isLoading, isFetchingNextPage, hasMore } =
    useScheduleStore();

  // Each entry is a scheduleTimeKey(scheduleId, time) — one per individually
  // selected reminder time, not one per schedule.
  const [selectedKeys, setSelectedKeys] = useState<string[]>(syncedTimeKeys);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUserSchedules(true);
  }, []);

  // The device only supports daily/weekly schedules, which could live on any
  // page of the user's full schedule list — so keep paging until everything
  // is loaded rather than only ever considering the first page.
  useEffect(() => {
    if (!isLoading && !isFetchingNextPage && hasMore && userSchedules.length > 0) {
      fetchUserSchedules();
    }
  }, [isLoading, isFetchingNextPage, hasMore, userSchedules.length]);

  const isInitialLoading = isLoading && userSchedules.length === 0;

  // Monthly schedules can never be represented on-device — the protocol's
  // weekday bitmask has no day-of-month concept at all (see
  // buildScheduleSlotsFromSchedules in bleStore.ts). Only daily/weekly
  // schedules are considered here; monthly ones are surfaced separately
  // below purely as read-only information, never selectable for sync.
  const eligibleSchedules = useMemo(
    () => userSchedules.filter((s) => s.scheduleType !== "monthly" && scheduleId(s)),
    [userSchedules],
  );
  const ineligibleSchedules = useMemo(
    () => userSchedules.filter((s) => s.scheduleType === "monthly"),
    [userSchedules],
  );

  // Every selectable time across eligible schedules, so a stale key left
  // over from a since-deleted/changed schedule doesn't inflate the count.
  const eligibleTimeKeys = useMemo(() => {
    const keys = new Set<string>();
    eligibleSchedules.forEach((schedule) => {
      const id = scheduleId(schedule)!;
      scheduleTimes(schedule).forEach((time) => keys.add(scheduleTimeKey(id, time)));
    });
    return keys;
  }, [eligibleSchedules]);

  const slotsUsed = useMemo(
    () => selectedKeys.filter((key) => eligibleTimeKeys.has(key)).length,
    [selectedKeys, eligibleTimeKeys],
  );

  const handleBack = React.useCallback(() => router.back(), [router]);

  const handleToggleTime = (schedule: Schedule, time: string) => {
    const id = scheduleId(schedule);
    if (!id) return;
    const key = scheduleTimeKey(id, time);
    const isSelected = selectedKeys.includes(key);
    if (isSelected) {
      setSelectedKeys((prev) => prev.filter((existing) => existing !== key));
      return;
    }
    // Block selecting past the device's hard 10-slot cap rather than
    // silently truncating later at sync time.
    if (slotsUsed + 1 > SCHEDULE_SLOT_COUNT) {
      alert.show(
        AlertPresets.error(
          t(LocalizedStrings.device.sync.slotLimitTitle),
          t(LocalizedStrings.device.sync.slotLimitMessage, { count: SCHEDULE_SLOT_COUNT }),
        ),
      );
      return;
    }
    setSelectedKeys((prev) => [...prev, key]);
  };

  const handleSave = async () => {
    if (connectionStatus !== "connected") {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.device.notConnected), t(LocalizedStrings.device.sync.notConnectedMessage)),
      );
      return;
    }
    setIsSaving(true);
    try {
      useBLEStore.getState().setSyncedTimeKeys(selectedKeys);
      const result = await syncSchedulesToDevice(userSchedules);
      if (result.skippedScheduleIds.length > 0) {
        alert.show(
          AlertPresets.error(
            t(LocalizedStrings.device.sync.skippedTitle),
            t(LocalizedStrings.device.sync.skippedMessage, {
              skipped: result.skippedScheduleIds.length,
              used: result.slotsUsed,
              total: SCHEDULE_SLOT_COUNT,
            }),
          ),
        );
      } else {
        alert.show(
          AlertPresets.success(
            t(LocalizedStrings.device.sync.syncedTitle),
            t(LocalizedStrings.device.sync.syncedMessage, { used: result.slotsUsed, total: SCHEDULE_SLOT_COUNT }),
          ),
        );
        router.back();
      }
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: verticalScale(100) }}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>

        <ThemeText variant="manrope.h2" style={styles.header}>
          {t(LocalizedStrings.device.sync.title)}
        </ThemeText>
        <ThemeText variant="manrope.body2" style={styles.description}>
          {t(LocalizedStrings.device.sync.description)}
        </ThemeText>

        <View style={styles.slotCounterRow}>
          <ThemeText variant="manrope.body1Bold" style={{ color: theme.colors.text.primary }}>
            {t(LocalizedStrings.device.sync.slotsUsed, { used: slotsUsed, total: SCHEDULE_SLOT_COUNT })}
          </ThemeText>
        </View>

        <View style={styles.section}>
          {isInitialLoading ? (
            <>
              <ScheduleCardSkeleton theme={theme} />
              <ScheduleCardSkeleton theme={theme} />
              <ScheduleCardSkeleton theme={theme} />
            </>
          ) : (
            <>
              {eligibleSchedules.length === 0 && (
                <ThemeText variant="manrope.body2" style={styles.emptyText}>
                  {t(LocalizedStrings.device.sync.empty)}
                </ThemeText>
              )}
              {eligibleSchedules.map((schedule) => {
                const id = scheduleId(schedule)!;
                return (
                  <ScheduleCard
                    key={id}
                    theme={theme}
                    schedule={schedule}
                    selectable
                    isTimeSelected={(time) => selectedKeys.includes(scheduleTimeKey(id, time))}
                    onToggleTime={(time) => handleToggleTime(schedule, time)}
                  />
                );
              })}
            </>
          )}
        </View>

        {!isInitialLoading && ineligibleSchedules.length > 0 && (
          <View style={styles.section}>
            <ThemeText variant="manrope.body1Bold" style={styles.sectionLabel}>
              {t(LocalizedStrings.device.sync.unavailableTitle)}
            </ThemeText>
            <ThemeText variant="manrope.caption" style={styles.emptyText}>
              {t(LocalizedStrings.device.sync.unavailableDescription)}
            </ThemeText>
            {ineligibleSchedules.map((schedule) => (
              <ScheduleCard key={scheduleId(schedule) ?? schedule.name} theme={theme} schedule={schedule} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button title={t(LocalizedStrings.common.save)} onPress={handleSave} loading={isSaving} fullWidth style={styles.saveBtn} />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: verticalScale(16) },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      marginTop: verticalScale(20),
    },
    description: {
      color: theme.colors.text.secondary,
      marginTop: verticalScale(8),
      marginBottom: verticalScale(16),
    },
    backButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.primary.main,
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonInner: {
      aspectRatio: 1,
      height: verticalScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    slotCounterRow: {
      marginBottom: verticalScale(12),
    },
    section: {
      gap: verticalScale(10),
      marginBottom: verticalScale(20),
    },
    sectionLabel: {
      color: theme.colors.text.primary,
      marginBottom: verticalScale(4),
    },
    emptyText: {
      color: theme.colors.text.secondary,
      marginBottom: verticalScale(8),
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: verticalScale(16),
      backgroundColor: theme.colors.background.default,
    },
    saveBtn: {
      height: verticalScale(56),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
  });
