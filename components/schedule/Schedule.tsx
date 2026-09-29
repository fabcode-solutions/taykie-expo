import { fontFamily, Theme, useTheme } from "@/theme";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ThemeText } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Medication } from "@/types/products.types";
import Tabs from "../shared/tabs/Tabs";
import { Button } from "@/components/ui/button";
import { useScheduleStore } from "@/stores/scheduleStore";
import { generateWeek } from "@/app/(tabs)/schedule";
import { format } from "date-fns";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { FrequencyType } from "@/types/schedule.types";
import { getTimeOfDay } from "@/utils/formatter";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { useBLEConnection } from "@/stores/bleStore";
interface ScheduleProps {
  item: Medication | null;
  onAddRoutine?: (
    frequency: FrequencyType,
    timeOfDay: string,
    selectedDay?: string,
    seletedMonthDay?: number,
    reminders?: { push?: boolean; led?: boolean; sound?: boolean },
    saveToDevice?: boolean,
  ) => void;
}

type FrequencyKey = "daily" | "weekly" | "monthly";
type TimeOfDayKey = "morning" | "afternoon" | "evening" | "night";
const Frequency_DEFAULTS: Record<FrequencyKey, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};
const TimeOfDayKey_DEFAULTS: Record<TimeOfDayKey, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};
const TimeOfDayKey_ICONS: Record<TimeOfDayKey, React.ComponentProps<typeof Ionicons>["name"]> = {
  morning: "sunny-outline",
  afternoon: "sunny",
  evening: "moon-outline",
  night: "moon",
};

const parseScheduleTime = (time?: string): Date => {
  const date = new Date();
  if (!time) return date;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return date;
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const parseScheduleTimes = (raw?: string): Date[] => {
  const parts = raw
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts && parts.length ? parts.map(parseScheduleTime) : [new Date()];
};

const Schedule = ({ item, onAddRoutine }: ScheduleProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const alert = useAlert();
  const { height: windowHeight } = useWindowDimensions();
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);
  const [reminders, setReminders] = React.useState({
    push: true,
    led: true,
    sound: false,
  });

  const weekDays = React.useMemo(() => generateWeek(new Date()), []);
  const [selectedMonthDay, setSelectedMonthDay] = React.useState(new Date().getDate());
  const [selectedDayIndex, setSelectedDayIndex] = React.useState(() => {
    const todayIndex = weekDays.findIndex(
      (day) => format(day.date, "d") === format(new Date(), "d"),
    );
    return todayIndex >= 0 ? todayIndex : 0;
  });

  const selectedDayName = format(weekDays[selectedDayIndex].date, "EEEE");
  const { isLoading } = useScheduleStore();
  const { connectionStatus } = useBLEConnection();
  const toggleReminder = useCallback((key: keyof typeof reminders) => {
    setReminders((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const frequency = React.useMemo(
    () =>
      (Object.keys(Frequency_DEFAULTS) as FrequencyKey[]).map((key) => ({
        key,
        label: t(`home.schedule.${key}`, { defaultValue: Frequency_DEFAULTS[key] }),
      })),
    [t],
  );
  const [activeFrequency, setActiveFrequency] = React.useState<FrequencyKey>(
    item?.frequency ?? "daily",
  );
  const [times, setTimes] = React.useState<Date[]>(() => parseScheduleTimes(item?.timeOfDay));
  const [activePickerIndex, setActivePickerIndex] = React.useState<number | null>(null);

  // The device's F2 slots have no day-of-month concept, so a monthly
  // schedule can never be represented on it (same constraint as the
  // dedicated On-Device Reminders screen) — and obviously nothing can be
  // pushed over Bluetooth without a live connection.
  const isDeviceConnected = connectionStatus === "connected";
  const canSaveToDevice = isDeviceConnected && activeFrequency !== "monthly";
  const [saveToDevice, setSaveToDevice] = React.useState(false);

  // Don't leave a stale "on" toggle silently ignored — if the user had it on
  // and then switched to Monthly (or the device disconnected), turn it back
  // off so the toggle's own state always matches what will actually happen.
  React.useEffect(() => {
    if (!canSaveToDevice) setSaveToDevice(false);
  }, [canSaveToDevice]);

  const getTimeOfDayInfo = useCallback(
    (time: Date) => {
      const key = getTimeOfDay(format(time, "HH:mm")) as TimeOfDayKey;
      return {
        key,
        label: t(`home.schedule.${key}`, { defaultValue: TimeOfDayKey_DEFAULTS[key] }),
      };
    },
    [t],
  );

  const warnDuplicateTime = useCallback(() => {
    alert.show(
      AlertPresets.warning(
        t(LocalizedStrings.common.warning),
        t(LocalizedStrings.schedule.routine.duplicateTime),
      ),
    );
  }, [alert, t]);

  const addTime = useCallback(() => {
    setTimes((prev) => [...prev, new Date()]);
  }, []);

  const removeTime = useCallback((index: number) => {
    setActivePickerIndex(null);
    setTimes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTime = useCallback(
    (index: number, date: Date) => {
      const newTimeKey = format(date, "HH:mm");
      const isDuplicate = times.some(
        (time, i) => i !== index && format(time, "HH:mm") === newTimeKey,
      );
      if (isDuplicate) {
        warnDuplicateTime();
        return;
      }
      setTimes((prev) => prev.map((time, i) => (i === index ? date : time)));
    },
    [times, warnDuplicateTime],
  );

  const handleAddProduct = useCallback(() => {
    const timeKeys = times.map((time) => format(time, "HH:mm"));
    if (new Set(timeKeys).size !== timeKeys.length) {
      warnDuplicateTime();
      return;
    }

    const selectedDay =
      activeFrequency === "weekly"
        ? selectedDayName
        : activeFrequency === "monthly"
          ? String(selectedMonthDay)
          : undefined;
    const scheduleTime = timeKeys.join(", ");
    onAddRoutine?.(
      activeFrequency,
      scheduleTime,
      selectedDay,
      selectedMonthDay,
      reminders,
      canSaveToDevice && saveToDevice,
    );
  }, [
    activeFrequency,
    times,
    selectedDayName,
    selectedMonthDay,
    onAddRoutine,
    reminders,
    warnDuplicateTime,
    canSaveToDevice,
    saveToDevice,
  ]);

  return (
    <View>
      <ScrollView
        style={[themedStyles.scrollArea, { maxHeight: windowHeight * 0.5 }]}
        contentContainerStyle={themedStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Tabs
          initialKey={item?.frequency}
          onSelect={(e) => setActiveFrequency(e as FrequencyKey)}
          segments={frequency}
        />

        <View style={themedStyles.timePickerSection}>
          <ThemeText variant="manrope.body1Bold" style={themedStyles.timePickerLabel}>
            {t(LocalizedStrings.schedule.routine.selectTime)}
          </ThemeText>

          {times.map((time, index) => {
            
            const { key, label } = getTimeOfDayInfo(time);
            const isPickerOpen = activePickerIndex === index;
            return (
              <View key={index}>
                <View style={themedStyles.timeRow}>
                  <TouchableOpacity
                    style={themedStyles.timeRowButton}
                    onPress={() => setActivePickerIndex(isPickerOpen ? null : index)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Select dosage time"
                  >
                    <Ionicons
                      name="time-outline"
                      size={moderateScale(18)}
                      color={theme.colors.text.primary}
                    />
                    <Text style={themedStyles.timeRowText}>{format(time, "h:mm a")}</Text>
                  </TouchableOpacity>

                  <View style={themedStyles.timeOfDayBadge}>
                    <Ionicons
                      name={TimeOfDayKey_ICONS[key]}
                      size={moderateScale(14)}
                      color={theme.colors.primary.dark}
                    />
                    <Text style={themedStyles.timeOfDayBadgeText}>{label}</Text>
                  </View>

                  {times.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeTime(index)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove time"
                    >
                      <Ionicons
                        name="close-circle"
                        size={moderateScale(20)}
                        color={theme.colors.text.secondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {isPickerOpen && (
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      if (Platform.OS === "android") setActivePickerIndex(null);
                      if (event.type !== "dismissed" && date) updateTime(index, date);
                    }}
                  />
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={themedStyles.addTimeButton}
            onPress={addTime}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add another time"
          >
            <Ionicons
              name="add-circle-outline"
              size={moderateScale(18)}
              color={theme.colors.text.primary}
            />
            <Text style={themedStyles.addTimeButtonText}>
              {t(LocalizedStrings.schedule.routine.addTime)}
            </Text>
          </TouchableOpacity>
        </View>

        {activeFrequency === "weekly" && (
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
        {activeFrequency === "monthly" && (
          <View style={themedStyles.dateRowWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={themedStyles.dateRow}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const isActive = day === selectedMonthDay;
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedMonthDay(day)}
                    activeOpacity={0.9}
                    style={[themedStyles.datePill, isActive && themedStyles.datePillActive]}
                  >
                    <Text
                      style={[isActive ? themedStyles.dateActive : themedStyles.dateInactive]}
                      className={`${isActive ? "text-primary" : "text-triatry-20"} font-Manrope-Bold font-semibold text-xs leading-4`}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={themedStyles.monthlyNote}>
              <Ionicons
                name="information-circle-outline"
                size={moderateScale(16)}
                color={theme.colors.text.secondary}
              />
              <Text style={themedStyles.monthlyNoteText}>
                {t(LocalizedStrings.schedule.routine.monthlyDeviceNote)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={themedStyles.deviceSyncRow}
          activeOpacity={canSaveToDevice ? 0.85 : 1}
          disabled={!canSaveToDevice}
          onPress={() => setSaveToDevice((prev) => !prev)}
          accessibilityRole="switch"
          accessibilityState={{ checked: saveToDevice, disabled: !canSaveToDevice }}
        >
          <View style={themedStyles.deviceSyncLabelBlock}>
            <ThemeText
              variant="manrope.body1Bold"
              style={[themedStyles.deviceSyncLabel, !canSaveToDevice && themedStyles.dimmedText]}
            >
              {t(LocalizedStrings.schedule.routine.saveToDevice)}
            </ThemeText>
            {/* The monthly case already has its own note above (monthlyNote) —
                this one only needs to cover "eligible frequency, just not
                connected right now". */}
            {!isDeviceConnected && activeFrequency !== "monthly" && (
              <ThemeText variant="manrope.caption" style={themedStyles.deviceSyncNote}>
                {t(LocalizedStrings.schedule.routine.saveToDeviceNotConnected)}
              </ThemeText>
            )}
          </View>
          <View
            style={[
              themedStyles.reminderToggle,
              saveToDevice && canSaveToDevice && themedStyles.reminderToggleActive,
            ]}
          >
            {saveToDevice && canSaveToDevice && (
              <Ionicons
                name="checkmark"
                size={moderateScale(18)}
                color={theme.colors.text.primary}
                style={themedStyles.reminderToggleIcon}
              />
            )}
          </View>
        </TouchableOpacity>

        <ThemeText variant="manrope.body1Bold" style={themedStyles.modalSectionLabel}>
          {t(LocalizedStrings.schedule.routine.reminders.title)}
        </ThemeText>

        <View style={themedStyles.reminderRow}>
          {(["push", "led", "sound"] as (keyof typeof reminders)[]).map((key) => {
            const isActive = reminders[key];
            return (
              <TouchableOpacity
                key={key}
                style={[themedStyles.checkWrapper]}
                activeOpacity={0.85}
                onPress={() => toggleReminder(key)}
              >
                <View
                  style={[
                    themedStyles.reminderToggle,
                    isActive && themedStyles.reminderToggleActive,
                  ]}
                >
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={moderateScale(18)}
                      color={theme.colors.text.primary}
                      style={themedStyles.reminderToggleIcon}
                    />
                  )}
                </View>
                <ThemeText
                  variant="manrope.body1Bold"
                  style={[
                    themedStyles.reminderToggleText,
                    isActive && themedStyles.reminderToggleTextActive,
                  ]}
                >
                  {t(`schedule.routine.reminders.${key}`, {
                    defaultValue: key === "push" ? "Push" : key === "led" ? "LED" : "Sound",
                  })}
                </ThemeText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <Button
        title={t(LocalizedStrings.schedule.routine.submit)}
        onPress={handleAddProduct}
        style={themedStyles.modalPrimaryButton}
        loading={isLoading}
        fullWidth
      />
    </View>
  );
};

export default Schedule;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    checkWrapper: {
      flexDirection: "row",
      gap: theme.spacing.smd,
      flex: 1,
      alignItems: "center",
    },
    modalPrimaryButton: {
      backgroundColor: theme.colors.primary.main,
      height: verticalScale(60),
      borderRadius: 999,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.colors.primary.main,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(4),
      elevation: 5,
      fontFamily: fontFamily.gascogneSerial.regular,
    },
    modalSectionLabel: {
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.smd,
    },
    scrollArea: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: theme.spacing.smd,
    },
    timePickerSection: {
      marginBottom: theme.spacing.lg,
    },
    timePickerLabel: {
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.smd,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.smd,
      marginBottom: theme.spacing.smd,
    },
    timeRowButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.smd,
      flex: 1,
      height: verticalScale(50),
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.spacing.smd,
      backgroundColor: theme.colors.background.default,
      borderWidth: scale(1),
      borderColor: "rgba(0,0,0,0.08)",
    },
    timeRowText: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.medium,
      fontSize: moderateScale(16),
    },
    timeOfDayBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.smd,
      paddingVertical: verticalScale(6),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
    timeOfDayBadgeText: {
      color: theme.colors.primary.dark,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(12),
    },
    addTimeButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      alignSelf: "flex-start",
      paddingVertical: theme.spacing.xs,
    },
    addTimeButtonText: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(14),
    },
    reminderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xl,
    },
    reminderToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.spacing.xs,
      aspectRatio: 1,
      height: verticalScale(30),
      backgroundColor: theme.colors.background.default,
      borderWidth: scale(1),
      borderColor: "rgba(0,0,0,0.08)",
    },
    // Pre-existing gap: referenced by both this toggle and the original
    // push/led/sound row below, but was never actually defined.
    reminderToggleIcon: {},
    reminderToggleActive: {
      backgroundColor: theme.colors.primary.main,
      borderColor: theme.colors.primary.main,
    },
    reminderToggleText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(12),

      maxWidth: scale(70),
    },
    reminderToggleTextActive: {
      color: theme.colors.text.primary,
    },
    dateRowWrapper: {
      marginBottom: theme.spacing.lg,
    },
    monthlyNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.smd,
    },
    monthlyNoteText: {
      flex: 1,
      color: theme.colors.text.secondary,
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(12),
    },
    deviceSyncRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.smd,
      paddingVertical: theme.spacing.smd,
      marginBottom: theme.spacing.mlg,
      borderRadius: theme.spacing.smd,
      borderWidth: scale(1),
      borderColor: "rgba(0,0,0,0.08)",
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background.default,
    },
    deviceSyncLabelBlock: {
      flex: 1,
      gap: verticalScale(2),
    },
    deviceSyncLabel: {
      color: theme.colors.text.primary,
    },
    deviceSyncNote: {
      color: theme.colors.text.secondary,
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(11),
    },
    dimmedText: {
      opacity: 0.5,
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
