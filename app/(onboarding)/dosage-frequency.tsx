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

type FrequencyOption = {
  value: 1 | 2 | 3;
  label: string;
  description: string;
  times: string[];
  compartments: number;
};

const OPTIONS: FrequencyOption[] = [
  {
    value: 1,
    label: "Once a day",
    description: "One compartment — morning, evening, or whenever suits you.",
    times: ["08:00"],
    compartments: 7,
  },
  {
    value: 2,
    label: "Twice a day",
    description: "Two compartments — e.g. morning and evening.",
    times: ["08:00", "20:00"],
    compartments: 14,
  },
  {
    value: 3,
    label: "Three times a day",
    description: "Three compartments — morning, midday and evening.",
    times: ["08:00", "13:00", "20:00"],
    compartments: 21,
  },
];

function CompartmentGraphic({ count, theme }: { count: number; theme: Theme }) {
  const cols = 7;
  const rows = count / cols;
  return (
    <View style={compartmentStyles.wrapper}>
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={compartmentStyles.row}>
          {Array.from({ length: cols }).map((_, col) => (
            <View
              key={col}
              style={[
                compartmentStyles.cell,
                {
                  backgroundColor: theme.colors.primary.main,
                  borderColor: theme.colors.slateCharcoal + "33",
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const compartmentStyles = StyleSheet.create({
  wrapper: { gap: verticalScale(4) },
  row: { flexDirection: "row", gap: scale(4) },
  cell: {
    width: scale(34),
    height: scale(34),
    borderRadius: moderateScale(6),
    borderWidth: scale(1),
  },
});

export default function DosageFrequency() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { currentStep, totalSteps, dose_frequency, setDoseFrequency, nextStep, prevStep } =
    useOnboardingStore();
  const [selected, setSelected] = React.useState<1 | 2 | 3>(dose_frequency);

  const selectedOption = OPTIONS.find((o) => o.value === selected)!;

  const handleNext = () => {
    setDoseFrequency(selected, selectedOption.times);
    nextStep();
    router.push("/(onboarding)/supplement-entry");
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  const handleSkip = () => {
    nextStep();
    router.push("/(onboarding)/supplement-entry");
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
      <View style={styles.heading}>
        <ThemeText variant="gs.h2" style={styles.title}>
          {t(LocalizedStrings.onboarding.dosage.frequency.title)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.dosage.frequency.description)}
        </ThemeText>
      </View>

      {/* Selection cards */}
      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.card,
                {
                  borderColor: isSelected ? theme.colors.slateCharcoal : theme.colors.border,
                  backgroundColor: isSelected
                    ? theme.colors.primary.main
                    : theme.colors.background.paper,
                },
              ]}
              onPress={() => setSelected(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={opt.label}
            >
              <View style={styles.cardRow}>
                <ThemeText
                  variant="manrope.body1Bold"
                  style={{
                    color: isSelected ? theme.colors.slateCharcoal : theme.colors.text.primary,
                  }}
                >
                  {t(`onboarding.dosage.frequency.frequency${opt.value}`)}
                </ThemeText>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? theme.colors.slateCharcoal : theme.colors.border,
                      backgroundColor: isSelected ? theme.colors.slateCharcoal : "transparent",
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[styles.radioDot, { backgroundColor: theme.colors.primary.main }]}
                    />
                  )}
                </View>
              </View>
              <ThemeText
                variant="manrope.body2"
                style={{
                  color: isSelected
                    ? theme.colors.slateCharcoal + "CC"
                    : theme.colors.text.secondary2,
                }}
              >
                {t(`onboarding.dosage.frequency.frequencyDesc${opt.value}`)}
              </ThemeText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Live compartment graphic */}
      <View
        style={[
          styles.graphicCard,
          { backgroundColor: theme.colors.background.paper, borderColor: theme.colors.border },
        ]}
      >
        <ThemeText
          variant="manrope.body2Bold"
          style={[styles.graphicLabel, { color: theme.colors.text.secondary2 }]}
        >
          {selectedOption.compartments}{" "}
          {t(LocalizedStrings.onboarding.dosage.compartments_per_week)}
        </ThemeText>
        <CompartmentGraphic count={selectedOption.compartments} theme={theme} />
      </View>

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
      marginBottom: verticalScale(20),
    },
    card: {
      borderWidth: scale(2),
      borderRadius: moderateScale(14),
      padding: scale(16),
      gap: verticalScale(6),
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    radio: {
      width: scale(22),
      height: scale(22),
      borderRadius: moderateScale(11),
      borderWidth: scale(2),
      justifyContent: "center",
      alignItems: "center",
    },
    radioDot: {
      width: scale(8),
      height: scale(8),
      borderRadius: moderateScale(4),
    },
    graphicCard: {
      borderWidth: scale(1),
      borderRadius: moderateScale(14),
      padding: scale(16),
      gap: verticalScale(12),
      alignItems: "center",
      marginBottom: verticalScale(24),
    },
    graphicLabel: {
      textAlign: "center",
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
    btnText: {
      color: theme.colors.slateCharcoal,
    },
  });
