import { fontFamily, Theme, useTheme } from "@/theme";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemeText } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import { Medication } from "@/types/products.types";
import Tabs from "../shared/tabs/Tabs";
import { Button } from "@/components/ui/button";
import { useScheduleStore } from "@/stores/scheduleStore";
import { generateWeek } from "@/app/(tabs)/schedule";
import { format } from "date-fns";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { FrequencyType } from "@/types/schedule.types";
interface ScheduleProps {
  item: Medication | null;
  onAddRoutine?: (
    frequency: FrequencyType,
    timeOfDay: string | string[],
    selectedDay?: string,
    seletedMonthDay?: number,
    reminders?: { push?: boolean; led?: boolean; sound?: boolean },
  ) => void;
}

type FrequencyKey = "daily" | "weekly" | "monthly";
type TimeOfDayKey = "morning" | "afternoon" | "evening"|"night";
const Frequency_DEFAULTS: Record<FrequencyKey, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};
const TimeOfDayKey_DEFAULTS: Record<TimeOfDayKey, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night:"night"
};

const Schedule = ({ item, onAddRoutine }: ScheduleProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
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
  const timeOfday = React.useMemo(
    () =>
      (Object.keys(TimeOfDayKey_DEFAULTS) as TimeOfDayKey[]).map((key) => ({
        key,
        label: t(`home.schedule.${key}`, { defaultValue: TimeOfDayKey_DEFAULTS[key] }),
      })),
    [t],
  );
  const [activeFrequency, setActiveFrequency] = React.useState<FrequencyKey>(
    item?.frequency ?? "daily",
  );
  const [activeTime, setActiveTime] = React.useState<TimeOfDayKey>("morning");

  const handleAddProduct = useCallback(() => {
    const selectedDay =
      activeFrequency === "weekly"
        ? selectedDayName
        : activeFrequency === "monthly"
          ? String(selectedMonthDay)
          : undefined;
    onAddRoutine?.(activeFrequency, activeTime, selectedDay, selectedMonthDay, reminders);
  }, [activeFrequency, activeTime, selectedDayName, selectedMonthDay, onAddRoutine, reminders]);

  return (
    <View>
      <Tabs
        initialKey={item?.frequency}
        onSelect={(e) => setActiveFrequency(e as FrequencyKey)}
        segments={frequency}
      />

      <Tabs
        multiSelect
        initialKey={item?.timeOfDay}
        onSelect={(e) => setActiveTime(e as TimeOfDayKey)}
        segments={timeOfday}
      />

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
        </View>
      )}
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
                style={[themedStyles.reminderToggle, isActive && themedStyles.reminderToggleActive]}
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
