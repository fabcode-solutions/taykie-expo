import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

const getResponseMessage = (score: number | null): string => {
  if (score === null) return "";
  if (score <= 3) return t(LocalizedStrings.onboarding.check_in.score_response.less_than_three);
  if (score <= 6) return t(LocalizedStrings.onboarding.check_in.score_response.less_than_six);
  return t(LocalizedStrings.onboarding.check_in.score_response.default);
};

const getResponseEmoji = (score: number | null): string => {
  if (score === null) return "";
  if (score <= 3) return "🌱";
  if (score <= 6) return "📈";
  return "🏆";
};

export default function BaselineCheckin() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const {
    currentStep,
    totalSteps,
    baseline_adherence_score,
    setBaselineScore,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  const [score, setScore] = React.useState<number | null>(baseline_adherence_score);

  const handleSelect = (val: number) => setScore(val);

  const handleNext = () => {
    setBaselineScore(score);
    nextStep();
    router.push("/(onboarding)/coaching-optin");
  };

  const handleSkip = () => {
    setBaselineScore(null);
    nextStep();
    router.push("/(onboarding)/coaching-optin");
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  const message = getResponseMessage(score);
  const emoji = getResponseEmoji(score);

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
          {t(LocalizedStrings.onboarding.check_in.title)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.check_in.description)}
        </ThemeText>
      </View>

      {/* Scale labels */}
      <View style={styles.scaleLabels}>
        <ThemeText variant="manrope.caption" style={{ color: theme.colors.text.secondary2 }}>
          {t(LocalizedStrings.onboarding.check_in.scale_labels.often)}
        </ThemeText>
        <ThemeText variant="manrope.caption" style={{ color: theme.colors.text.secondary2 }}>
          {t(LocalizedStrings.onboarding.check_in.scale_labels.never)}
        </ThemeText>
      </View>

      {/* Tap-to-select number scale */}
      <View
        style={styles.scoreRow}
        accessibilityRole="radiogroup"
        accessibilityLabel="Adherence score 1 to 10"
      >
        {SCORES.map((val) => {
          const isSelected = score === val;
          const isMid = val === 5;
          return (
            <TouchableOpacity
              key={val}
              style={[
                styles.scoreBtn,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary.main
                    : theme.colors.background.paper,
                  borderColor: isSelected
                    ? theme.colors.slateCharcoal
                    : isMid
                      ? theme.colors.gray[400]
                      : theme.colors.border,
                  borderWidth: isSelected ? 2 : isMid ? 1.5 : 1,
                },
              ]}
              onPress={() => handleSelect(val)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`Score ${val} out of 10`}
            >
              <ThemeText
                variant="manrope.body1Bold"
                style={{
                  color: isSelected ? theme.colors.slateCharcoal : theme.colors.text.primary,
                }}
              >
                {val}
              </ThemeText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mid label */}
      <View style={styles.midLabel}>
        <ThemeText
          variant="manrope.caption"
          style={{ color: theme.colors.text.secondary2, textAlign: "center" }}
        >
          5 = {t(LocalizedStrings.onboarding.check_in.hit_and_miss)}
        </ThemeText>
      </View>

      {/* Affirming message */}
      <View
        style={[
          styles.messageCard,
          {
            backgroundColor: score ? theme.colors.primary.main + "22" : theme.colors.gray[100],
            borderColor: score ? theme.colors.primary.main : theme.colors.border,
            opacity: score ? 1 : 0.5,
          },
        ]}
      >
        {score ? (
          <>
            <ThemeText style={styles.emoji}>{emoji}</ThemeText>
            <ThemeText
              variant="manrope.body2"
              style={{ color: theme.colors.text.primary, textAlign: "center", flex: 1 }}
            >
              {message}
            </ThemeText>
          </>
        ) : (
          <ThemeText
            variant="manrope.body2"
            style={{ color: theme.colors.text.hint, textAlign: "center" }}
          >
            {t(LocalizedStrings.onboarding.check_in.see_personalised_message)}
          </ThemeText>
        )}
      </View>

      <ThemeButton
        title={t(LocalizedStrings.common.next)}
        onPress={handleNext}
        style={styles.btn}
        textStyle={styles.btnText}
        fullWidth
      />
      {/* 
      <View style={styles.skipRow}>
        <ThemeText
          variant="manrope.body2"
          style={{ color: theme.colors.text.secondary2 }}
          onPress={handleSkip}
        >
          {t(LocalizedStrings.common.skip)}
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
    scaleLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: verticalScale(10),
    },
    scoreRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: scale(8),
      justifyContent: "center",
    },
    scoreBtn: {
      width: scale(48),
      height: scale(48),
      borderRadius: moderateScale(12),
      justifyContent: "center",
      alignItems: "center",
    },
    midLabel: {
      marginTop: verticalScale(10),
      marginBottom: verticalScale(20),
    },
    messageCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      borderWidth: scale(1),
      borderRadius: moderateScale(14),
      padding: scale(16),
      minHeight: verticalScale(64),
      marginBottom: verticalScale(24),
      justifyContent: "center",
    },
    emoji: {
      fontSize: moderateScale(24),
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
