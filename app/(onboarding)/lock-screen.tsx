import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Switch from "@/components/ui/Switch";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

function LockScreenMockup({ theme }: { theme: Theme }) {
  return (
    <View
      style={[
        mockupStyles.phone,
        { backgroundColor: "#1C1C1E", borderColor: theme.colors.gray[700] },
      ]}
    >
      {/* Status bar */}
      <View style={mockupStyles.statusBar}>
        <ThemeText style={mockupStyles.statusText}>9:41</ThemeText>
        <View style={mockupStyles.statusIcons}>
          <Ionicons name="wifi" size={moderateScale(10)} color={theme.colors.white} />
          <Ionicons name="battery-full" size={moderateScale(10)} color={theme.colors.white} />
        </View>
      </View>

      {/* Lock icon */}
      <View style={mockupStyles.lockRow}>
        <Ionicons name="lock-closed" size={moderateScale(14)} color="rgba(255,255,255,0.6)" />
      </View>

      {/* Time */}
      <ThemeText style={mockupStyles.clockText}>9:41</ThemeText>
      <ThemeText style={mockupStyles.dateText}>Friday, March 20</ThemeText>

      {/* Notification card */}
      <View style={[mockupStyles.notifCard, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
        <View style={mockupStyles.notifIconWrap}>
          <Ionicons
            name="medical"
            size={moderateScale(14)}
            color={theme.colors.slateCharcoal}
            style={{ backgroundColor: theme.colors.primary.main, borderRadius: 6, padding: 3 }}
          />
        </View>
        <View style={mockupStyles.notifContent}>
          <ThemeText style={mockupStyles.notifApp}>Taykie</ThemeText>
          <ThemeText style={mockupStyles.notifMsg}>Time for your morning supplements 💊</ThemeText>
        </View>
      </View>
    </View>
  );
}

const mockupStyles = StyleSheet.create({
  phone: {
    width: scale(160),
    height: verticalScale(280),
    borderRadius: moderateScale(24),
    borderWidth: scale(2),
    overflow: "hidden",
    padding: scale(12),
    alignSelf: "center",
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  statusText: { color: "#fff", fontSize: moderateScale(8), fontWeight: "600" },
  statusIcons: { flexDirection: "row", gap: scale(3) },
  lockRow: { alignItems: "center", marginTop: verticalScale(4) },
  clockText: {
    color: "#fff",
    fontSize: moderateScale(32),
    fontWeight: "300",
    textAlign: "center",
    lineHeight: verticalScale(40),
  },
  dateText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: moderateScale(10),
    textAlign: "center",
    marginBottom: verticalScale(10),
  },
  notifCard: {
    borderRadius: moderateScale(12),
    padding: verticalScale(10),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  notifIconWrap: {
    aspectRatio: 1,
    height: verticalScale(24),
    justifyContent: "center",
    alignItems: "center",
  },
  notifContent: { flex: 1 },
  notifApp: { color: "#fff", fontSize: moderateScale(9), fontWeight: "600" },
  notifMsg: {
    color: "rgba(255,255,255,0.85)",
    fontSize: moderateScale(9),
    lineHeight: verticalScale(13),
  },
});

export default function LockScreenDisplay() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { currentStep, totalSteps, lock_screen_reminders, setLockScreen, nextStep, prevStep } =
    useOnboardingStore();

  const [enabled, setEnabled] = React.useState(lock_screen_reminders);

  const handleNext = () => {
    setLockScreen(enabled);
    nextStep();
    router.push("/(onboarding)/baseline-checkin");
  };

  const handleSkip = () => {
    setLockScreen(false);
    nextStep();
    router.push("/(onboarding)/baseline-checkin");
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  const osNote = t(
    Platform.OS === "ios"
      ? LocalizedStrings.onboarding.lock_screen.osNote.ios
      : LocalizedStrings.onboarding.lock_screen.osNote.android,
  );

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
          {t(LocalizedStrings.onboarding.lock_screen.title)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.lock_screen.description)}
        </ThemeText>
      </View>

      {/* Mockup */}
      <View style={styles.mockupSection}>
        <LockScreenMockup theme={theme} />
      </View>

      {/* Toggle */}
      <View
        style={[
          styles.toggleCard,
          {
            backgroundColor: theme.colors.background.paper,
            borderColor: enabled ? theme.colors.slateCharcoal : theme.colors.border,
          },
        ]}
      >
        <View style={styles.toggleLeft}>
          <View
            style={[
              styles.toggleIcon,
              {
                backgroundColor: enabled ? theme.colors.primary.main : theme.colors.gray[100],
              },
            ]}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={moderateScale(22)}
              color={enabled ? theme.colors.slateCharcoal : theme.colors.text.secondary2}
            />
          </View>
          <View style={styles.toggleText}>
            <ThemeText variant="manrope.body1Bold" style={{ color: theme.colors.text.primary }}>
              {t(LocalizedStrings.settings.notificationSettings.showOnLockScreen.title)}
            </ThemeText>
            <ThemeText variant="manrope.caption" style={{ color: theme.colors.text.secondary2 }}>
              {osNote}
            </ThemeText>
          </View>
        </View>
        <Switch
          value={enabled}
          onPress={() => setEnabled((v) => !v)}
          style={styles.switch}
          trackColors={{
            on: theme.colors.slateCharcoal,
            off: theme.colors.gray[300],
          }}
        />
      </View>

      <ThemeButton
        title={t(LocalizedStrings.common.next)}
        onPress={handleNext}
        style={styles.btn}
        textStyle={styles.btnText}
        fullWidth
      />

      {/* <View style={styles.skipRow}>
        <ThemeText
          variant="manrope.body2"
          style={{ color: theme.colors.text.secondary2 }}
          onPress={handleSkip}
        >
          {t(LocalizedStrings.onboarding.lock_screen.skip_for_now)}
        </ThemeText>
      </View> */}
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
    mockupSection: {
      marginBottom: verticalScale(28),
    },
    toggleCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: scale(1.5),
      borderRadius: moderateScale(14),
      padding: scale(14),
      marginBottom: verticalScale(24),
    },
    toggleLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(12),
      flex: 1,
    },
    toggleIcon: {
      width: scale(44),
      height: scale(44),
      borderRadius: moderateScale(12),
      justifyContent: "center",
      alignItems: "center",
    },
    toggleText: { flex: 1, gap: verticalScale(2) },
    switch: {
      width: scale(52),
      height: scale(28),
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
    btnText: { color: theme.colors.slateCharcoal },
    skipRow: {
      alignItems: "center",
      marginTop: verticalScale(16),
    },
  });
