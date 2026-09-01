import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton, SafeAreaScreen, ThemeStatusBar } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

const DOSE_FREQ_LABELS: Record<number, string> = {
  1: "Once daily",
  2: "Twice daily",
  3: "Three times daily",
};

const REMINDER_ICONS: {
  key: "reminder_sound" | "reminder_light" | "reminder_push";
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { key: "reminder_sound", icon: "volume-high-outline", label: "sound" },
  { key: "reminder_light", icon: "flashlight-outline", label: "light" },
  { key: "reminder_push", icon: "phone-portrait-outline", label: "notification" },
];

function CheckmarkAnimation({ theme }: { theme: Theme }) {
  const scale_ = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale_.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale_.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: scale(88),
          height: scale(88),
          borderRadius: scale(44),
          backgroundColor: theme.colors.primary.main,
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "center",
        },
      ]}
    >
      <Ionicons name="checkmark" size={moderateScale(48)} color={theme.colors.slateCharcoal} />
    </Animated.View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <View
      style={[
        summaryStyles.card,
        {
          backgroundColor: theme.colors.background.paper,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[summaryStyles.iconWrap, { backgroundColor: theme.colors.primary.main + "33" }]}>
        <Ionicons name={icon} size={moderateScale(20)} color={theme.colors.slateCharcoal} />
      </View>
      <View style={summaryStyles.text}>
        <ThemeText variant="manrope.caption" style={{ color: theme.colors.text.secondary2 }}>
          {label}
        </ThemeText>
        <ThemeText variant="manrope.body2Bold" style={{ color: theme.colors.text.primary }}>
          {value}
        </ThemeText>
      </View>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    borderWidth: scale(1),
    borderRadius: 12,
    padding: scale(12),
  },
  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(10),
    justifyContent: "center",
    alignItems: "center",
  },
  text: { gap: verticalScale(2) },
});

export default function AllSet() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const store = useOnboardingStore();

  // Calculate next dose time based on frequency and current time
  const getNextDoseTime = (): string => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const times = store.dose_times;
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const tMinutes = h * 60 + m;
      if (tMinutes > nowMinutes) {
        const period = h >= 12 ? "pm" : "am";
        const hour = h % 12 === 0 ? 12 : h % 12;
        return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
      }
    }
    // All times passed — next is tomorrow's first
    const first = times[0];
    const [h, m] = first.split(":").map(Number);
    const period = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period} ${t(LocalizedStrings.onboarding.all_set.tomorrow)}`;
  };

  const activeReminders =
    REMINDER_ICONS.filter((r) => store[r.key])
      .map((r) => t(`onboarding.all_set.reminders.${r.label}`))
      .join(", ") || t(LocalizedStrings.common.none);

  const handleGoToDashboard = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaScreen style={[styles.root, { backgroundColor: theme.colors.background.default }]}>
      <ThemeStatusBar />
      <View style={styles.inner}>
        {/* Header area */}
        <View style={styles.heroSection}>
          <CheckmarkAnimation theme={theme} />

          <ThemeText variant="gs.h2" style={styles.title} align="center">
            {t(LocalizedStrings.onboarding.all_set.title)}
          </ThemeText>
          <ThemeText
            variant="manrope.body1"
            align="center"
            style={{ color: theme.colors.text.secondary2 }}
          >
            {t(LocalizedStrings.onboarding.taykie_is_ready)}{" "}
            <ThemeText variant="manrope.body1Bold" style={{ color: theme.colors.text.primary }}>
              {getNextDoseTime()}
            </ThemeText>
            .
          </ThemeText>
        </View>

        {/* Summary cards */}
        <View style={styles.summarySection}>
          <ThemeText
            variant="manrope.body2Bold"
            style={[styles.summaryLabel, { color: theme.colors.text.secondary2 }]}
          >
            {t(LocalizedStrings.onboarding.all_set.your_setup)}
          </ThemeText>

          <View style={styles.cards}>
            <SummaryCard
              icon="repeat-outline"
              label={t(LocalizedStrings.onboarding.all_set.summary.dose)}
              value={t(`onboarding.all_set.frequency.${store.dose_frequency}`)}
              theme={theme}
            />
            <SummaryCard
              icon="time-outline"
              label={t(LocalizedStrings.onboarding.all_set.summary.reminder)}
              value={getNextDoseTime()}
              theme={theme}
            />
            <SummaryCard
              icon="notifications-outline"
              label={t(LocalizedStrings.onboarding.all_set.summary.type)}
              value={activeReminders}
              theme={theme}
            />
          </View>
        </View>

        {/* CTA */}
        <View style={styles.actions}>
          <ThemeButton
            title={t(LocalizedStrings.onboarding.all_set.take_me_to_dashboard)}
            onPress={handleGoToDashboard}
            style={styles.btn}
            textStyle={styles.btnText}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    inner: {
      flex: 1,
      paddingHorizontal: scale(24),
      justifyContent: "space-between",
      paddingBottom: verticalScale(32),
    },
    heroSection: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: verticalScale(16),
      paddingTop: verticalScale(24),
    },
    title: {
      marginTop: verticalScale(8),
    },
    summarySection: {
      gap: verticalScale(12),
      marginBottom: verticalScale(24),
    },
    summaryLabel: {
      letterSpacing: scale(1.2),
    },
    cards: {
      gap: verticalScale(10),
    },
    actions: {},
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
    btnText: { color: theme.colors.slateCharcoal },
  });
