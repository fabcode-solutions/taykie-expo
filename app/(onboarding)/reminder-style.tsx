import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import Switch from "@/components/ui/Switch";
import Ionicons from "@expo/vector-icons/Ionicons";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

interface SoundOption {
  key: string;
  label: string;
  description: string;
}

const SOUNDS: SoundOption[] = [
  {
    key: "gentle_chime",
    label: "Gentle Chime",
    description: "Soft single bell — calm and non-intrusive",
  },
  { key: "soft_bells", label: "Soft Bells", description: "Gentle repeating bell sequence" },
  { key: "morning_tone", label: "Morning Tone", description: "Warm ascending two-note tone" },
  { key: "soft_ping", label: "Soft Ping", description: "Clean, minimal notification ding" },
  { key: "nature_chime", label: "Nature Chime", description: "Wind chime texture, airy feel" },
  { key: "calm_arpeggio", label: "Calm Arpeggio", description: "Short ascending piano notes" },
  { key: "marimba_tap", label: "Marimba Tap", description: "Warm marimba single note" },
];

interface ReminderOptionProps {
  label: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onToggle: () => void;
  theme: Theme;
}

const ReminderOption: React.FC<ReminderOptionProps> = ({
  label,
  description,
  iconName,
  value,
  onToggle,
  theme,
}) => (
  <View
    style={[
      reminderOptionStyles.row,
      {
        backgroundColor: theme.colors.background.paper,
        borderColor: value ? theme.colors.slateCharcoal : theme.colors.border,
      },
    ]}
  >
    <View
      style={[
        reminderOptionStyles.iconWrap,
        {
          backgroundColor: value ? theme.colors.primary.main : theme.colors.gray[100],
        },
      ]}
    >
      <Ionicons
        name={iconName}
        size={moderateScale(22)}
        color={value ? theme.colors.slateCharcoal : theme.colors.text.secondary2}
      />
    </View>
    <View style={reminderOptionStyles.textWrap}>
      <ThemeText variant="manrope.body1Bold" style={{ color: theme.colors.text.primary }}>
        {label}
      </ThemeText>
      <ThemeText variant="manrope.caption" style={{ color: theme.colors.text.secondary2 }}>
        {description}
      </ThemeText>
    </View>
    <Switch
      value={value}
      onPress={onToggle}
      style={reminderOptionStyles.switch}
      trackColors={{
        on: theme.colors.slateCharcoal,
        off: theme.colors.gray[300],
      }}
    />
  </View>
);

const reminderOptionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    borderWidth: scale(1.5),
    borderRadius: 14,
    padding: scale(14),
  },
  iconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: { flex: 1, gap: 2 },
  switch: {
    width: scale(52),
    height: scale(28),
  },
});

export default function ReminderStyle() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const {
    currentStep,
    totalSteps,
    reminder_sound,
    reminder_sound_name,
    reminder_light,
    reminder_push,
    setReminderStyle,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  const [sound, setSound] = React.useState(reminder_sound);
  const [soundName, setSoundName] = React.useState(reminder_sound_name || "gentle_chime");
  const [light, setLight] = React.useState(reminder_light);
  const [push, setPush] = React.useState(reminder_push);
  const [validationError, setValidationError] = React.useState(false);

  const noneSelected = !sound && !light && !push;

  const handleNext = () => {
    if (noneSelected) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    setReminderStyle(sound, soundName, light, push);
    nextStep();
    router.push("/(onboarding)/lock-screen");
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  const handleSkip = () => {
    nextStep();
    router.push("/(onboarding)/lock-screen");
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
          {t(LocalizedStrings.onboarding.reminder_style.title)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.reminder_style.description)}
        </ThemeText>
      </View>
      {/* Options */}

      <View style={styles.options}>
        <ReminderOption
          label={t(LocalizedStrings.settings.notificationSettings.notificationSound.title)}
          description={t(
            LocalizedStrings.settings.notificationSettings.notificationSound.description,
          )}
          iconName="volume-high-outline"
          value={sound}
          onToggle={() => {
            setSound((v) => !v);
            setValidationError(false);
          }}
          theme={theme}
        />

        <ReminderOption
          label={t(LocalizedStrings.onboarding.reminder_style.glow_light.title)}
          description={t(LocalizedStrings.onboarding.reminder_style.glow_light.description)}
          iconName="flashlight-outline"
          value={light}
          onToggle={() => {
            setLight((v) => !v);
            setValidationError(false);
          }}
          theme={theme}
        />

        <ReminderOption
          label={t(LocalizedStrings.settings.notificationSettings.appNotification.title)}
          description={t(
            LocalizedStrings.settings.notificationSettings.appNotification.description2,
          )}
          iconName="phone-portrait-outline"
          value={push}
          onToggle={() => {
            setPush((v) => !v);
            setValidationError(false);
          }}
          theme={theme}
        />
      </View>

      {validationError && (
        <ThemeText
          variant="manrope.caption"
          style={[styles.error, { color: theme.colors.error.main }]}
        >
          {t(LocalizedStrings.onboarding.reminder_style.enable_atleast_one)}
        </ThemeText>
      )}
      <ThemeButton
        title={t(LocalizedStrings.common.next)}
        onPress={handleNext}
        style={styles.btn}
        textStyle={styles.btnText}
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
    options: {
      gap: verticalScale(12),
      marginBottom: verticalScale(8),
    },
    soundSelector: {
      borderWidth: scale(1),
      borderRadius: moderateScale(14),
      padding: scale(14),
      marginTop: verticalScale(-4),
    },
    soundRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(8),
    },
    soundInfo: { flex: 1, gap: 2 },
    soundRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
    },
    playBtn: {
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(4),
      borderRadius: 6,
    },
    error: {
      textAlign: "center",
      marginBottom: verticalScale(12),
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      marginTop: verticalScale(8),
    },
    btnText: { color: theme.colors.slateCharcoal },
  });
