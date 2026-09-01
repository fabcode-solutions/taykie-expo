import React, { useState } from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { ThemeButton } from "@/components";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import {
  useOnboardingStore,
  type SupplementSlot,
  type SupplementItem,
} from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatTime } from "@/utils/time";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import BlurModal from "@/components/ui/Modal";
import AddProduct, { ProductDetails } from "@/components/schedule/AddProduct";
import SearchModal from "@/components/schedule/SearchModal";
import { useProductStore } from "@/stores/productStore";
import { ProductRequest } from "@/types/products.types";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function SupplementEntry() {
  const theme = useTheme();
  const alert = useAlert();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { currentStep, totalSteps, supplements, setSupplements, nextStep, prevStep } =
    useOnboardingStore();
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [addProductVisible, setAddProductVisible] = React.useState(false);
  const [slots, setSlots] = React.useState<SupplementSlot[]>(supplements);
  const [error, setError] = React.useState<string | null>(null);
  const [pickerIndex, setPickerIndex] = React.useState<number | null>(null);
  const { products, fetchPublicProducts, createProduct } = useProductStore();
  const updateSlotLabel = (slotIndex: number, time: string) => {
    const updated = [...slots];
    updated[slotIndex] = { ...updated[slotIndex], scheduleTime: time };
    setSlots(updated);
  };

  React.useEffect(() => {
    fetchPublicProducts();
  }, []);

  const updateItem = (
    slotIndex: number,
    itemIndex: number,
    field: keyof SupplementItem,
    value: string,
  ) => {
    const updated = slots.map((slot, si) => {
      if (si !== slotIndex) return slot;
      const items = slot.items.map((item, ii) =>
        ii === itemIndex ? { ...item, [field]: value } : item,
      );
      return { ...slot, items };
    });
    setSlots(updated);
    setError(null);
  };

  const addItem = (slotIndex: number) => {
    const updated = slots.map((slot, si) =>
      si === slotIndex ? { ...slot, items: [...slot.items, { name: "", dose: "" }] } : slot,
    );
    setSlots(updated);
  };

  const removeItem = (slotIndex: number, itemIndex: number) => {
    const updated = slots.map((slot, si) => {
      if (si !== slotIndex) return slot;
      const items = slot.items.filter((_, ii) => ii !== itemIndex);
      return { ...slot, items: items.length === 0 ? [{ name: "", dose: "" }] : items };
    });
    setSlots(updated);
  };

  const handleNext = () => {
    const hasAtLeastOne = slots.some((slot) =>
      slot.items.some((item) => item.name.trim().length > 0),
    );

    const slotTimeExists = slots.some(
      (slot) => slot.scheduleTime && slot.scheduleTime.trim().length > 0,
    );
    if (!slotTimeExists) {
      setError(t(LocalizedStrings.onboarding.supplements.errors.time));
      return;
    }
    if (!hasAtLeastOne) {
      setError(t(LocalizedStrings.onboarding.supplements.errors.alteast_one));
      return;
    }

    setSupplements(slots);
    nextStep();
    router.push("/(onboarding)/other-supplements");
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  // Converts a string like "08:30" to a JavaScript Date object
  const parseTimeToDate = (timeString: string): Date => {
    // 1. Fallback if timeString is missing or invalid
    if (!timeString) return new Date();

    // 2. Try to parse "hh:mm AM/PM"
    const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);

    if (!match) {
      // If it doesn't match the format, return current time to prevent crash
      return new Date();
    }

    let [_, hoursStr, minutesStr, modifier] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // 3. Convert to 24-hour format for the Date object
    if (modifier.toUpperCase() === "PM" && hours < 12) {
      hours += 12;
    }
    if (modifier.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }

    // 4. Create a new Date object for today, and set the parsed hours/minutes
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date;
  };

  const handleSkip = () => {
    nextStep();
    router.push("/(onboarding)/other-supplements");
  };

  const handleAddProduct = React.useCallback(async (product: ProductDetails) => {
    try {
      const request: ProductRequest = {
        name: product.productName,
        type: product.type,
        dosage: product.dosageCount + product.dosageCount > 1 ? " Tablet" : " Tablets",
        strength: product.strength + " mg",
        ...(product.description && { description: product.description }),
      };
      await createProduct(request);
      setAddProductVisible(false);
      setSearchVisible(true);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

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
          {t(LocalizedStrings.onboarding.supplements.your_supplements)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.supplements.description)}
        </ThemeText>
      </View>

      {slots.map((slot, si) => (
        <View key={si} style={styles.slotWrapper}>
          <ThemeText variant="manrope.subtitle2">Slot {si + 1}</ThemeText>
          <View style={styles.slotSection}>
            {/* Editable time-of-day label */}
            <View style={[styles.slotHeader, { borderColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.androidTimeBtn,
                  {
                    // Change border color based on whether this specific picker is open
                    borderColor:
                      pickerIndex === si ? theme.colors.text.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setPickerIndex(si)} // Track which slot is being edited
              >
                <Ionicons
                  name="time-outline"
                  size={moderateScale(18)}
                  color={pickerIndex === si ? theme.colors.text.primary : theme.colors.border}
                />
                <ThemeText
                  color={
                    pickerIndex === si ? theme.colors.text.primary : theme.colors.text.secondary
                  }
                  variant="manrope.body1Bold"
                >
                  {slot.scheduleTime || t(LocalizedStrings.onboarding.supplements.select_time)}
                </ThemeText>
              </TouchableOpacity>

              {pickerIndex === si && (
                <DateTimePicker
                  // Better fallback: if no slot.time, just provide a fresh Date object
                  value={slot.scheduleTime ? parseTimeToDate(slot.scheduleTime) : new Date()}
                  mode="time"
                  display={Platform.OS === "android" ? "default" : "spinner"}
                  onChange={(event, date) => {
                    // 1. If the user dismisses the picker (Android), just close it and do nothing
                    if (event.type === "dismissed") {
                      setPickerIndex(null);
                      return;
                    }

                    // 2. Close picker on normal selection
                    setPickerIndex(null);

                    // 3. Ensure the date exists and is valid before updating
                    if (date && !isNaN(date.getTime())) {
                      updateSlotLabel(si, formatTime(date));
                    }
                  }}
                />
              )}
            </View>

            {slot.items.map((item, ii) => (
              <View key={ii} style={styles.itemRow}>
                <View style={styles.itemFields}>
                  <TextInput
                    onPress={() => {
                      setActiveIndex(si);
                      setSearchVisible(true);
                    }}
                    editable={false}
                    value={item.name}
                    onChangeText={(val) => updateItem(si, ii, "name", val)}
                    placeholder={t(LocalizedStrings.onboarding.supplements.name)}
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
                    accessibilityLabel={`Supplement name for slot ${si + 1}, item ${ii + 1}`}
                  />

                  <TextInput
                    value={item.dose}
                    onChangeText={(val) => updateItem(si, ii, "dose", val)}
                    placeholder={t(LocalizedStrings.onboarding.dosage.placeholder.dosage)}
                    placeholderTextColor={theme.colors.text.hint}
                    style={[
                      styles.input,
                      styles.doseInput,
                      {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.border,
                        color: theme.colors.text.primary,
                      },
                    ]}
                    maxLength={40}
                    accessibilityLabel={`Dosage for slot ${si + 1}, item ${ii + 1}`}
                  />
                </View>
                {slot.items.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeItem(si, ii)}
                    style={styles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t(LocalizedStrings.onboarding.supplements.remove)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={moderateScale(22)}
                      color={theme.colors.error.main}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* <TouchableOpacity
              onPress={() => addItem(si)}
              style={styles.addLink}
              accessibilityRole="button"
            >
              <Ionicons
                name="add-circle-outline"
                size={moderateScale(18)}
                color={theme.colors.slateCharcoal}
              />
              <ThemeText variant="manrope.body2Bold" style={{ color: theme.colors.slateCharcoal }}>
                {t(LocalizedStrings.onboarding.supplements.add_item)}
              </ThemeText>
            </TouchableOpacity> */}
          </View>
        </View>
      ))}

      {error && (
        <ThemeText
          variant="manrope.caption"
          style={[styles.errorText, { color: theme.colors.error.main }]}
        >
          {error}
        </ThemeText>
      )}

      <ThemeButton
        title={t(LocalizedStrings.common.next)}
        onPress={handleNext}
        style={styles.btn}
        textStyle={styles.btnText}
        fullWidth
      />

      <BlurModal
        heading={t(LocalizedStrings.schedule.addProduct.submit)}
        visible={addProductVisible}
        onRequestClose={() => setAddProductVisible(false)}
      >
        <AddProduct
          item={null}
          initialDosage={1}
          initialStrength={500}
          onAddProduct={handleAddProduct}
        />
      </BlurModal>

      <BlurModal
        heading={t(LocalizedStrings.schedule.placeHolders.search)}
        visible={searchVisible}
        contentStyle={{ gap: verticalScale(20) }}
        onRequestClose={() => {
          setSearchVisible(false);
        }}
      >
        <SearchModal
          items={products}
          onSelect={(product) => {
            updateItem(activeIndex, 0, "name", product?.name);
            setSearchVisible(false);
            if (!product) setAddProductVisible(true);
          }}
          placeholder={`${t(LocalizedStrings.schedule.placeHolders.search)}...`}
        />
      </BlurModal>
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
    slotSection: {
      marginBottom: verticalScale(20),
      padding: scale(16),
      borderRadius: moderateScale(16),
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background.elevated,
    },
    slotHeader: {
      paddingBottom: verticalScale(8),
      marginBottom: verticalScale(10),
      borderBottomWidth: 1,
      gap: scale(6),
    },
    slotLabelInput: {
      fontSize: moderateScale(15),
      flex: 1,
      paddingVertical: 0,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
      marginBottom: verticalScale(8),
    },
    itemFields: {
      flex: 1,
      gap: verticalScale(6),
    },
    input: {
      height: verticalScale(52),
      borderWidth: scale(1),
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(14),
      fontSize: moderateScale(13),
      fontFamily: theme.typography.manrope.body2.fontFamily,
    },
    doseInput: {
      height: verticalScale(44),
    },
    removeBtn: {
      alignSelf: "center",
      marginTop: verticalScale(6),
    },
    addLink: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: verticalScale(4),
    },
    errorText: {
      marginBottom: verticalScale(8),
      textAlign: "center",
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      marginTop: verticalScale(8),
    },
    btnText: {
      color: theme.colors.slateCharcoal,
    },

    androidTimeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      borderWidth: scale(1),
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(16),
      height: verticalScale(56),
      marginBottom: verticalScale(8),
      backgroundColor: theme.colors.inputBackground,
    },
    slotWrapper: {
      marginBottom: verticalScale(10),
      gap: verticalScale(10),
    },
  });
