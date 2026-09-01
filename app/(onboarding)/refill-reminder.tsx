import React from "react";
import { StyleSheet, View, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

const DAYS = [
  { key: "monday", label: "mon" },
  { key: "tuesday", label: "tue" },
  { key: "wednesday", label: "wed" },
  { key: "thursday", label: "thu" },
  { key: "friday", label: "fri" },
  { key: "saturday", label: "sat" },
  { key: "sunday", label: "sun" },
];

const formatTime = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

const formatDisplay = (time: string): string => {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
};

const dayLabel = (key: string): string => {
  const labels: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };
  return labels[key] ?? key;
};

export default function RefillReminder() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const {
    currentStep,
    totalSteps,
    refill_day,
    refill_time,
    setRefillReminder,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  const [selectedDays, setSelectedDays] = React.useState<string[]>(
    refill_day.length > 0 ? refill_day : ["sunday"],
  );

  // Build a Date from stored time string
  const buildDate = (timeStr: string): Date => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };
  const [timeDate, setTimeDate] = React.useState<Date>(buildDate(refill_time || "08:00"));
  const [showPicker, setShowPicker] = React.useState(false);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const previewText = (): string => {
    if (selectedDays.length === 0)
      return t(LocalizedStrings.onboarding.supplements.refill_taykie.select_one);
    const dayNames = selectedDays.map((d) => dayLabel(d)).join(", ");
    return t("onboarding.supplements.refill_taykie.wiil_remind_you", {
      day: dayNames,
      time: formatDisplay(formatTime(timeDate)),
    });
  };

  const handleNext = () => {
    if (selectedDays.length === 0) return;
    setRefillReminder(selectedDays, formatTime(timeDate));
    nextStep();
    router.push("/(onboarding)/reminder-style");
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  const handleSkip = () => {
    nextStep();
    router.push("/(onboarding)/reminder-style");
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      showBack
      showSkip
      onSkip={handleSkip}
    >
      {/* Heading */}
      <View style={styles.heading}>
        <ThemeText variant="gs.h2" style={styles.title}>
          {t(LocalizedStrings.onboarding.supplements.refill_taykie.title)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.supplements.refill_taykie.description)}
        </ThemeText>
      </View>
      r{/* Day of week multi-select */}
      <ThemeText
        variant="manrope.body2Bold"
        style={[styles.sectionLabel, { color: theme.colors.text.primary }]}
      >
        {t(LocalizedStrings.onboarding.supplements.refill_taykie.day_of_week.title)}
      </ThemeText>
      <View style={styles.daysGrid}>
        {DAYS.map((d) => {
          const active = selectedDays.includes(d.key);
          return (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.dayBtn,
                {
                  borderColor: active ? theme.colors.slateCharcoal : theme.colors.border,
                  backgroundColor: active
                    ? theme.colors.primary.main
                    : theme.colors.background.paper,
                },
              ]}
              onPress={() => toggleDay(d.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={dayLabel(d.key)}
            >
              <ThemeText
                variant="manrope.body2Bold"
                style={{
                  color: active ? theme.colors.slateCharcoal : theme.colors.text.secondary2,
                }}
              >
                {t(`onboarding.supplements.refill_taykie.day_of_week.${d.label}`)}
              </ThemeText>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedDays.length === 0 && (
        <ThemeText
          variant="manrope.caption"
          style={[styles.validationMsg, { color: theme.colors.error.main }]}
        >
          {t(LocalizedStrings.onboarding.supplements.refill_taykie.select_one)}
        </ThemeText>
      )}
      {/* Time picker */}
      <ThemeText
        variant="manrope.body2Bold"
        style={[
          styles.sectionLabel,
          { color: theme.colors.text.primary, marginTop: verticalScale(20) },
        ]}
      >
        {t(LocalizedStrings.onboarding.supplements.refill_taykie.time)}
      </ThemeText>
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={timeDate}
          mode="time"
          display="spinner"
          onChange={(_, date) => date && setTimeDate(date)}
          style={styles.iosPicker}
          accessibilityLabel="Select refill time"
        />
      ) : (
        <TouchableOpacity
          style={[
            styles.androidTimeBtn,
            {
              backgroundColor: theme.colors.background.paper,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select refill time"
        >
          <Ionicons
            name="time-outline"
            size={moderateScale(20)}
            color={theme.colors.text.secondary2}
          />
          <ThemeText variant="manrope.body1" style={{ color: theme.colors.text.primary }}>
            {formatDisplay(formatTime(timeDate))}
          </ThemeText>
        </TouchableOpacity>
      )}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={timeDate}
          mode="time"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setTimeDate(date);
          }}
        />
      )}
      {/* Preview */}
      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: theme.colors.primary.main + "22",
            borderColor: theme.colors.primary.main,
          },
        ]}
      >
        <Ionicons
          name="notifications-outline"
          size={moderateScale(18)}
          color={theme.colors.slateCharcoal}
        />
        <ThemeText variant="manrope.body2" style={{ color: theme.colors.slateCharcoal, flex: 1 }}>
          {previewText()}
        </ThemeText>
      </View>
      <ThemeButton
        title={t(LocalizedStrings.common.next)}
        onPress={handleNext}
        style={styles.btn}
        textStyle={styles.btnText}
        disabled={selectedDays.length === 0}
        fullWidth
      />
    </OnboardingLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heading: {
      marginTop: verticalScale(8),
      marginBottom: verticalScale(24),
      gap: verticalScale(8),
    },
    title: { textAlign: "left" },
    subtitle: {},
    sectionLabel: { marginBottom: verticalScale(10) },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: scale(8),
      marginBottom: verticalScale(4),
    },
    dayBtn: {
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(10),
      borderRadius: moderateScale(10),
      borderWidth: scale(1.5),
      minWidth: scale(44),
      alignItems: "center",
    },
    validationMsg: { marginBottom: verticalScale(8) },
    iosPicker: {
      height: verticalScale(120),
      marginBottom: verticalScale(8),
    },
    androidTimeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      borderWidth: scale(1),
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(16),
      height: verticalScale(56),
      marginBottom: verticalScale(16),
    },
    previewCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      borderWidth: scale(1),
      borderRadius: moderateScale(12),
      padding: scale(14),
      marginTop: verticalScale(16),
      marginBottom: verticalScale(24),
    },
    btn: {
      position: "absolute",
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      bottom: verticalScale(20),
      alignSelf: "center",
    },
    btnText: { color: theme.colors.slateCharcoal },
  });
