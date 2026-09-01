import React from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, Switch as RNSwitch } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import Ionicons from "@expo/vector-icons/Ionicons";
import { OtherSupplement, useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

const PLACEHOLDERS = [
  "Protein powder",
  "Collagen powder",
  "Greens blend",
  "Fish oil liquid",
  "Creatine",
];

const emptyItem = (): OtherSupplement => ({
  name: "",
  dose: "",
  reminder_slots: [],
  restock_reminder: false,
  restock_lead_days: 7,
});

export default function OtherSupplements() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const {
    currentStep,
    totalSteps,
    supplements,
    other_supplements,
    setOtherSupplements,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  // Derive reminder slot options from configured dose slots
  const slotOptions = supplements.map((s) => ({ slot: s.slot, label: s.label }));

  const [wantsToAdd, setWantsToAdd] = React.useState<boolean | null>(false);
  const [items, setItems] = React.useState<OtherSupplement[]>(
    other_supplements.length > 0 ? other_supplements : [emptyItem()],
  );

  const updateItem = (index: number, field: keyof OtherSupplement, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const toggleSlot = (index: number, slot: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const slots = item.reminder_slots.includes(slot)
          ? item.reminder_slots.filter((s) => s !== slot)
          : [...item.reminder_slots, slot];
        return { ...item, reminder_slots: slots };
      }),
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleNext = () => {
    if (wantsToAdd === true) {
      const valid = items.filter((i) => i.name.trim().length > 0);
      setOtherSupplements(valid);
    } else {
      setOtherSupplements([]);
    }
    nextStep();
    router.push("/(onboarding)/refill-reminder");
  };

  const handleSkip = () => {
    setOtherSupplements([]);
    nextStep();
    router.push("/(onboarding)/refill-reminder");
  };

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
      showSkip
      onSkip={handleSkip}
    >
      {/* Heading */}
      <View style={styles.heading}>
        <ThemeText variant="gs.h2" style={styles.title}>
          {t(LocalizedStrings.onboarding.supplements.other.anything_else)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.supplements.other.description)}
        </ThemeText>
      </View>

      {/* Yes / No choice */}
      <View style={styles.choiceRow}>
        {([true, false] as const).map((val) => (
          <TouchableOpacity
            key={String(val)}
            style={[
              styles.choiceBtn,
              {
                borderColor: wantsToAdd === val ? theme.colors.slateCharcoal : theme.colors.border,
                backgroundColor:
                  wantsToAdd === val ? theme.colors.primary.main : theme.colors.background.paper,
              },
            ]}
            onPress={() => setWantsToAdd(val)}
            accessibilityRole="radio"
            accessibilityState={{ checked: wantsToAdd === val }}
          >
            <ThemeText
              variant="manrope.body1Bold"
              style={{
                color: wantsToAdd === val ? theme.colors.slateCharcoal : theme.colors.text.primary,
              }}
            >
              {val
                ? t(LocalizedStrings.onboarding.supplements.other.yes_add)
                : t(LocalizedStrings.onboarding.supplements.other.no_thanks)}
            </ThemeText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Entry form */}
      {wantsToAdd === true && (
        <View style={styles.formSection}>
          {items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.colors.background.paper,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {/* Remove button */}
              {items.length > 1 && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeItem(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={t(LocalizedStrings.onboarding.supplements.remove)}
                >
                  <Ionicons
                    name="close-circle"
                    size={moderateScale(20)}
                    color={theme.colors.error.main}
                  />
                </TouchableOpacity>
              )}

              {/* Product name */}
              <TextInput
                value={item.name}
                onChangeText={(v) => updateItem(idx, "name", v)}
                placeholder={PLACEHOLDERS[idx % PLACEHOLDERS.length]}
                placeholderTextColor={theme.colors.text.hint}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    color: theme.colors.text.primary,
                  },
                ]}
                maxLength={60}
                accessibilityLabel={t(LocalizedStrings.onboarding.supplements.name)}
              />

              {/* Serving size */}
              <TextInput
                value={item.dose}
                onChangeText={(v) => updateItem(idx, "dose", v)}
                placeholder={t(LocalizedStrings.onboarding.supplements.other.serving_size)}
                placeholderTextColor={theme.colors.text.hint}
                style={[
                  styles.input,
                  styles.smallInput,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    color: theme.colors.text.primary,
                  },
                ]}
                maxLength={40}
                accessibilityLabel="Serving size"
              />

              {/* Reminder slots checkboxes */}
              {slotOptions.length > 0 && (
                <View style={styles.slotSection}>
                  <ThemeText
                    variant="manrope.caption"
                    style={{ color: theme.colors.text.secondary2 }}
                  >
                    {t(LocalizedStrings.onboarding.supplements.other.remind_me)}
                  </ThemeText>
                  <View style={styles.slotRow}>
                    {slotOptions.map((opt) => {
                      const active = item.reminder_slots.includes(opt.slot);
                      return (
                        <TouchableOpacity
                          key={opt.slot}
                          style={[
                            styles.slotChip,
                            {
                              borderColor: active
                                ? theme.colors.slateCharcoal
                                : theme.colors.border,
                              backgroundColor: active
                                ? theme.colors.primary.main
                                : theme.colors.background.default,
                            },
                          ]}
                          onPress={() => toggleSlot(idx, opt.slot)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: active }}
                        >
                          <ThemeText
                            variant="manrope.caption"
                            style={{
                              color: active
                                ? theme.colors.slateCharcoal
                                : theme.colors.text.secondary2,
                            }}
                          >
                            {opt.label}
                          </ThemeText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Restock reminder toggle */}
              <View style={styles.restockRow}>
                <ThemeText
                  variant="manrope.body2"
                  style={{ flex: 1, color: theme.colors.text.primary }}
                >
                  {t(LocalizedStrings.onboarding.supplements.other.remind_in_running_low)}
                </ThemeText>
                <RNSwitch
                  value={item.restock_reminder}
                  onValueChange={(v) => updateItem(idx, "restock_reminder", v)}
                  trackColor={{
                    false: theme.colors.gray[300],
                    true: theme.colors.slateCharcoal,
                  }}
                  thumbColor={theme.colors.primary.main}
                  accessibilityLabel="Restock reminder"
                />
              </View>

              {item.restock_reminder && (
                <View style={styles.restockDaysRow}>
                  <ThemeText
                    variant="manrope.caption"
                    style={{ color: theme.colors.text.secondary2 }}
                  >
                    {t(LocalizedStrings.onboarding.supplements.other.keep_at_least)}
                  </ThemeText>
                  {[7, 14, 21, 30].map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.daysChip,
                        {
                          borderColor:
                            item.restock_lead_days === days
                              ? theme.colors.slateCharcoal
                              : theme.colors.border,
                          backgroundColor:
                            item.restock_lead_days === days
                              ? theme.colors.primary.main
                              : theme.colors.background.default,
                        },
                      ]}
                      onPress={() => updateItem(idx, "restock_lead_days", days)}
                    >
                      <ThemeText
                        variant="manrope.caption"
                        style={{
                          color:
                            item.restock_lead_days === days
                              ? theme.colors.slateCharcoal
                              : theme.colors.text.secondary2,
                        }}
                      >
                        {days}d
                      </ThemeText>
                    </TouchableOpacity>
                  ))}
                  <ThemeText
                    variant="manrope.caption"
                    style={{ color: theme.colors.text.secondary2 }}
                  >
                    {t(LocalizedStrings.common.supply)}
                  </ThemeText>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity onPress={addItem} style={styles.addLink} accessibilityRole="button">
            <Ionicons
              name="add-circle-outline"
              size={moderateScale(18)}
              color={theme.colors.slateCharcoal}
            />
            <ThemeText variant="manrope.body2Bold" style={{ color: theme.colors.slateCharcoal }}>
              {t(LocalizedStrings.onboarding.supplements.other.add_another)}
            </ThemeText>
          </TouchableOpacity>
        </View>
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
    choiceRow: {
      flexDirection: "row",
      gap: scale(12),
      marginBottom: verticalScale(24),
    },
    choiceBtn: {
      flex: 1,
      borderWidth: scale(2),
      borderRadius: moderateScale(14),
      paddingVertical: verticalScale(14),
      alignItems: "center",
      justifyContent: "center",
    },
    formSection: {
      gap: verticalScale(12),
      marginBottom: verticalScale(16),
    },
    itemCard: {
      borderWidth: scale(1),
      borderRadius: moderateScale(14),
      padding: scale(14),
      gap: verticalScale(10),
    },
    removeBtn: {
      alignSelf: "flex-end",
    },
    input: {
      height: verticalScale(52),
      borderWidth: scale(1),
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(14),
      fontSize: moderateScale(13),
      fontFamily: theme.typography.manrope.body2.fontFamily,
    },
    smallInput: {
      height: verticalScale(44),
    },
    slotSection: {
      gap: verticalScale(6),
    },
    slotRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: scale(8),
    },
    slotChip: {
      borderWidth: scale(1.5),
      borderRadius: moderateScale(20),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
    },
    restockRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
    },
    restockDaysRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: scale(6),
    },
    daysChip: {
      borderWidth: moderateScale(1.5),
      borderRadius: moderateScale(20),
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(4),
    },
    addLink: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: verticalScale(4),
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      marginTop: verticalScale(8),
    },
    btnText: { color: theme.colors.slateCharcoal },
  });
