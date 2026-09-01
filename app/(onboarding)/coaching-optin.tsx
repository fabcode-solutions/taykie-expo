import React, { useCallback } from "react";
import { StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import { Loader } from "@/components/shared/loader";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

interface CoachingOptionProps {
  selected: boolean;
  onPress: () => void;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  theme: Theme;
}

const CoachingOption: React.FC<CoachingOptionProps> = ({
  selected,
  onPress,
  iconName,
  title,
  description,
  theme,
}) => (
  <TouchableOpacity
    style={[
      coachStyles.card,
      {
        borderColor: selected ? theme.colors.slateCharcoal : theme.colors.border,
        backgroundColor: selected ? theme.colors.primary.main : theme.colors.background.paper,
      },
    ]}
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
  >
    <View
      style={[
        coachStyles.iconWrap,
        {
          backgroundColor: selected ? theme.colors.slateCharcoal : theme.colors.gray[100],
        },
      ]}
    >
      <Ionicons
        name={iconName}
        size={moderateScale(26)}
        color={selected ? theme.colors.primary.main : theme.colors.text.secondary2}
      />
    </View>
    <View style={coachStyles.textWrap}>
      <ThemeText
        variant="manrope.body1Bold"
        style={{
          color: selected ? theme.colors.slateCharcoal : theme.colors.text.primary,
        }}
      >
        {title}
      </ThemeText>
      <ThemeText
        variant="manrope.body2"
        style={{
          color: selected ? theme.colors.slateCharcoal + "CC" : theme.colors.text.secondary2,
        }}
      >
        {description}
      </ThemeText>
    </View>
    <View
      style={[
        coachStyles.radio,
        {
          borderColor: selected ? theme.colors.slateCharcoal : theme.colors.border,
          backgroundColor: selected ? theme.colors.slateCharcoal : "transparent",
        },
      ]}
    >
      {selected && (
        <View style={[coachStyles.radioDot, { backgroundColor: theme.colors.primary.main }]} />
      )}
    </View>
  </TouchableOpacity>
);

const coachStyles = StyleSheet.create({
  card: {
    borderWidth: scale(2),
    borderRadius: moderateScale(16),
    padding: scale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(14),
  },
  iconWrap: {
    width: scale(52),
    height: scale(52),
    borderRadius: moderateScale(14),
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: { flex: 1, gap: verticalScale(4) },
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
});

export default function CoachingOptin() {
  const theme = useTheme();
  const alert = useAlert();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const {
    currentStep,
    totalSteps,
    coaching_enabled,
    setCoachingEnabled,
    nextStep,
    prevStep,
    saveboardingDetails,
    isLoading,
  } = useOnboardingStore();

  const [selected, setSelected] = React.useState<boolean | null>(coaching_enabled);

  const handleNext = useCallback(async () => {
    setCoachingEnabled(selected === true);
    try {
      await saveboardingDetails();
      nextStep();
      router.push("/(onboarding)/all-set");
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const handleBack = () => {
    prevStep();
    router.back();
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      showBack
    >
      {isLoading && <Loader />}
      {/* Heading */}
      <View style={styles.heading}>
        <ThemeText variant="gs.h2" style={styles.title}>
          {t(LocalizedStrings.onboarding.coaching_optin.title)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.coaching_optin.description)}
        </ThemeText>
      </View>

      {/* Options */}
      <View style={styles.options}>
        <CoachingOption
          selected={selected === true}
          onPress={() => setSelected(true)}
          iconName="bulb-outline"
          title={t(LocalizedStrings.onboarding.coaching_optin.options.title1)}
          description={t(LocalizedStrings.onboarding.coaching_optin.options.description1)}
          theme={theme}
        />

        <CoachingOption
          selected={selected === false}
          onPress={() => setSelected(false)}
          iconName="close-circle-outline"
          title={t(LocalizedStrings.onboarding.coaching_optin.options.title2)}
          description={t(LocalizedStrings.onboarding.coaching_optin.options.description2)}
          theme={theme}
        />
      </View>

      {/* Info note */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: theme.colors.info.light,
            borderColor: theme.colors.info.main + "44",
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={moderateScale(18)}
          color={theme.colors.info.main}
        />
        <ThemeText
          variant="manrope.caption"
          style={{ color: theme.colors.text.secondary2, flex: 1 }}
        >
          {t(LocalizedStrings.onboarding.coaching_optin.tip)}
        </ThemeText>
      </View>

      <ThemeButton
        title={t(LocalizedStrings.common.done)}
        onPress={handleNext}
        style={[styles.btn, { opacity: selected === null ? 0.6 : 1 }]}
        textStyle={styles.btnText}
        disabled={selected === null}
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
      gap: verticalScale(14),
      marginBottom: verticalScale(20),
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: scale(10),
      borderWidth: scale(1),
      borderRadius: moderateScale(12),
      padding: scale(14),
      marginBottom: verticalScale(24),
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
    btnText: { color: theme.colors.slateCharcoal },
  });
