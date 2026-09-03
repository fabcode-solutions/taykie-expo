import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

type FrequencyOption = {
  value: 1 | 2 | 3;
  times: string[];
};

const OPTIONS: FrequencyOption[] = [
  { value: 1, times: ["08:00"] },
  { value: 2, times: ["08:00", "20:00"] },
  { value: 3, times: ["08:00", "13:00", "20:00"] },
];

export default function DosagePreferencesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const alert = useAlert();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { dose_frequency, setDoseFrequency, saveboardingDetails, isLoading } =
    useOnboardingStore();
  const [selected, setSelected] = useState<1 | 2 | 3>(dose_frequency);

  const handleBack = React.useCallback(() => router.back(), [router]);

  const handleSave = async () => {
    const option = OPTIONS.find((o) => o.value === selected)!;
    setDoseFrequency(selected, option.times);
    try {
      await saveboardingDetails();
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success)));
      router.back();
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: verticalScale(80) }}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            {t(LocalizedStrings.settings.dosagePreferences.title)}
          </ThemeText>
        </View>
        <ThemeText
          variant="manrope.body1"
          style={[styles.description, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.settings.dosagePreferences.description)}
        </ThemeText>

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

        <Button
          title={t(LocalizedStrings.settings.dosagePreferences.save)}
          onPress={handleSave}
          loading={isLoading}
          style={styles.btn}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: verticalScale(16),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(20),
      alignItems: "center",
    },
    description: {
      marginTop: verticalScale(8),
      marginBottom: verticalScale(20),
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
    options: {
      gap: verticalScale(12),
      marginBottom: verticalScale(24),
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
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
  });
