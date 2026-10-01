import React, { useCallback, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { fontFamily, useTheme, type Theme } from "@/theme";
import { ThemeText } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { Control, useForm } from "react-hook-form";
import { Input } from "../ui/TextInput/input";
import Select from "../ui/Select/select";
import { SearchItem } from "@/types/search.types";
import { useAuthStore } from "@/stores/authStore";
import {
  DELIVERY_FORMS,
  DOSAGE_UNITS,
  OTHER_OPTION,
  TARGET_MARKETS,
  fromChoice,
  marketForCountry,
  parseStrength,
  toChoice,
} from "@/utils/supplementCatalog";
// ============================================
// Types
// ============================================

export interface ProductDetails {
  productName?: string | null;
  dosageCount: number;
  strength: number;
  /** Unit of `strength`: a preset (mg, mcg, g, IU, ml, CFU) or whatever the user typed. */
  strengthUnit?: string;
  type?: string | null;
  description?: string | null;
  // Supplement details, collected when creating a new product.
  brandName?: string;
  primaryActiveIngredient?: string;
  deliveryForm?: string;
  targetMarket?: string;
  category?: string;
  barcodeGtin?: string;
}

// The form edits pickers as "choice + custom text" pairs, and the strength of a new
// product as free text; both are folded back into ProductDetails on submit.
interface FormValues extends ProductDetails {
  strengthText: string;
  strengthUnitChoice: string;
  strengthUnitCustom: string;
  deliveryFormChoice: string;
  deliveryFormCustom: string;
  targetMarketChoice: string;
  targetMarketCustom: string;
}

interface AddProductProps {
  item: SearchItem | null;
  productName?: string | null;
  initialDosage?: number;
  initialStrength?: number;
  /** Unit of initialStrength; defaults to the unit in item.strength, else mg. */
  initialUnit?: string;
  /** May return a promise (create/update) — the button shows a loader until it settles. */
  onAddProduct?: (product: ProductDetails) => void | Promise<unknown>;
}

interface CounterFieldProps {
  label: string;
  value: number;
  unit: string;
  onIncrement: () => void;
  onDecrement: () => void;
  theme: Theme;
}

// ============================================
// Reusable Counter Component
// ============================================

const CounterField = memo(
  ({ label, value, unit, onIncrement, onDecrement, theme }: CounterFieldProps) => {
    const themedStyles = createStyles(theme);
    const { t } = useTranslation();

    return (
      <View style={themedStyles.counterBlock}>
        <ThemeText variant="manrope.body1Bold" style={themedStyles.counterLabel}>
          {label}
        </ThemeText>
        <View style={themedStyles.counterInput}>
          <ThemeText variant="manrope.subtitle" style={themedStyles.counterValue}>
            {value} {unit}
          </ThemeText>
          <View style={themedStyles.counterControls}>
            <TouchableOpacity
              onPress={onDecrement}
              style={themedStyles.counterButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t(LocalizedStrings.accessibility.decrease, { label })}
            >
              <Ionicons name="remove" size={moderateScale(16)} color={theme.colors.divider} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onIncrement}
              style={[themedStyles.counterButton, themedStyles.counterButtonAccent]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t(LocalizedStrings.accessibility.increase, { label })}
            >
              <Ionicons name="add" size={moderateScale(16)} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

CounterField.displayName = "CounterField";

/** How far the +/- buttons move the strength, by unit. */
const strengthStep = (unit: string) => {
  switch (unit) {
    case "g":
    case "ml":
      return 1;
    case "mcg":
      return 50;
    case "IU":
    case "CFU":
      return 500;
    default:
      return 100;
  }
};

interface ChoiceFieldProps {
  control: Control<FormValues>;
  choiceName: "strengthUnitChoice" | "deliveryFormChoice" | "targetMarketChoice";
  customName: "strengthUnitCustom" | "deliveryFormCustom" | "targetMarketCustom";
  choice: string;
  label: string;
  options: { label: string; value: string }[];
  customPlaceholder: string;
}

/** A dropdown whose "Other" option reveals a text box for a value that isn't listed. */
const ChoiceField = memo(
  ({ control, choiceName, customName, choice, label, options, customPlaceholder }: ChoiceFieldProps) => {
    const { t } = useTranslation();
    return (
      <>
        <Select
          control={control}
          inputStyle={{ height: verticalScale(50) }}
          label={label}
          name={choiceName}
          options={[...options, { label: t(LocalizedStrings.product.fields.other), value: OTHER_OPTION }]}
        />
        {choice === OTHER_OPTION && (
          <Input
            control={control}
            name={customName}
            inputStyle={{ height: verticalScale(50) }}
            placeholder={customPlaceholder}
            autoCapitalize="none"
            rules={{
              validate: (v) => !!String(v ?? "").trim() || t(LocalizedStrings.product.fields.customRequired),
            }}
          />
        )}
      </>
    );
  },
);

ChoiceField.displayName = "ChoiceField";

// ============================================
// Main Component
// ============================================

const AddProduct: React.FC<AddProductProps> = ({
  item,
  initialDosage = 1,
  initialStrength = 500,
  initialUnit,
  onAddProduct,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The extra supplement fields only make sense when creating a new product.
  const isCreate = !item;
  const country = useAuthStore((s) => s.user?.country);

  const [defaults] = useState<FormValues>(() => {
    const unit = toChoice(initialUnit ?? parseStrength(item?.strength).unit ?? "mg", DOSAGE_UNITS);
    const form = toChoice(item?.deliveryForm, DELIVERY_FORMS);
    const market = toChoice(item?.targetMarket ?? (isCreate ? marketForCountry(country) : undefined), TARGET_MARKETS);
    return {
      productName: item?.name,
      description: item?.description,
      type: item?.type ?? "private",
      dosageCount: initialDosage,
      strength: initialStrength,
      strengthText: String(initialStrength),
      strengthUnitChoice: unit.choice,
      strengthUnitCustom: unit.custom,
      deliveryFormChoice: form.choice,
      deliveryFormCustom: form.custom,
      targetMarketChoice: market.choice,
      targetMarketCustom: market.custom,
      brandName: item?.brandName ?? "",
      primaryActiveIngredient: item?.primaryActiveIngredient ?? "",
      category: item?.category ?? "",
      barcodeGtin: "",
    };
  });

  const { control, watch, setValue, handleSubmit } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onSubmit",
    defaultValues: defaults,
  });

  const { dosageCount, strength, strengthUnitChoice, deliveryFormChoice, targetMarketChoice } = watch();
  const unitForStep = strengthUnitChoice === OTHER_OPTION ? "" : strengthUnitChoice;

  // Dosage handlers with useCallback for performance
  const handleDecrementDosage = useCallback(() => {
    setValue("dosageCount", Math.max(1, dosageCount - 1));
  }, [dosageCount]);

  const handleIncrementDosage = useCallback(() => {
    setValue("dosageCount", dosageCount + 1);
  }, [dosageCount]);

  // Strength handlers with useCallback for performance
  const handleDecrementStrength = useCallback(() => {
    const step = strengthStep(unitForStep);
    setValue("strength", Math.max(step, strength - step));
  }, [strength, unitForStep]);

  const handleIncrementStrength = useCallback(() => {
    setValue("strength", strength + strengthStep(unitForStep));
  }, [strength, unitForStep]);

  // Add product handler
  const handleAddProduct = useCallback(
    async (data: FormValues) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const text = (v?: string) => v?.trim() || undefined;
        await onAddProduct?.({
          productName: data.productName,
          description: data.description,
          type: data.type,
          dosageCount: data.dosageCount,
          strength: isCreate ? Number(data.strengthText.replace(",", ".")) : data.strength,
          strengthUnit: fromChoice(data.strengthUnitChoice, data.strengthUnitCustom) ?? "mg",
          ...(isCreate && {
            brandName: text(data.brandName),
            primaryActiveIngredient: text(data.primaryActiveIngredient),
            deliveryForm: fromChoice(data.deliveryFormChoice, data.deliveryFormCustom),
            targetMarket: fromChoice(data.targetMarketChoice, data.targetMarketCustom),
            category: text(data.category),
            barcodeGtin: text(data.barcodeGtin),
          }),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [onAddProduct, isCreate, isSubmitting],
  );

  return (
    <View style={themedStyles.container}>
      {/* Product Name Header (Optional) */}
      <ThemeText variant="gs.h2" style={themedStyles.productName}>
        {item?.name}
      </ThemeText>

      {/* Counter Fields Row */}
      <View style={themedStyles.dualFieldRow}>
        <Input
          label={t(LocalizedStrings.profile.name)}
          control={control}
          name="productName"
          inputStyle={{ height: verticalScale(50) }}
          rules={{
            required: !item ? t(LocalizedStrings.product.required) : false,
            pattern: {
              value: /^[A-Za-z0-9&()'/-]+(?: [A-Za-z0-9&()'/-]+)*$/,
              message: t(LocalizedStrings.errors.validation.name.invalid),
            },
          }}
          placeholder={t(LocalizedStrings.product.add_name)}
        />

        {isCreate && (
          <>
            <Input
              label={t(LocalizedStrings.product.fields.brand)}
              control={control}
              name="brandName"
              inputStyle={{ height: verticalScale(50) }}
              autoCapitalize="words"
              rules={{ maxLength: 100 }}
              placeholder={t(LocalizedStrings.product.fields.brand)}
            />
            <Input
              label={t(LocalizedStrings.product.fields.activeIngredient)}
              control={control}
              name="primaryActiveIngredient"
              inputStyle={{ height: verticalScale(50) }}
              autoCapitalize="words"
              rules={{ maxLength: 150 }}
              placeholder={t(LocalizedStrings.product.fields.activeIngredient)}
            />
          </>
        )}

        <CounterField
          label={t(LocalizedStrings.schedule.addProduct.dosage)}
          value={dosageCount}
          unit={t(LocalizedStrings.home.extras.tablet)}
          onIncrement={handleIncrementDosage}
          onDecrement={handleDecrementDosage}
          theme={theme}
        />

        {isCreate ? (
          <Input
            label={t(LocalizedStrings.schedule.addProduct.strength)}
            control={control}
            name="strengthText"
            keyboardType="decimal-pad"
            inputStyle={{ height: verticalScale(50) }}
            rules={{
              validate: (v) =>
                Number(String(v).replace(",", ".")) > 0 || t(LocalizedStrings.product.fields.strengthInvalid),
            }}
          />
        ) : (
          <CounterField
            label={t(LocalizedStrings.schedule.addProduct.strength)}
            value={strength}
            unit={strengthUnitChoice === OTHER_OPTION ? watch("strengthUnitCustom") : strengthUnitChoice}
            onIncrement={handleIncrementStrength}
            onDecrement={handleDecrementStrength}
            theme={theme}
          />
        )}

        <ChoiceField
          control={control}
          choiceName="strengthUnitChoice"
          customName="strengthUnitCustom"
          choice={strengthUnitChoice}
          label={t(LocalizedStrings.product.fields.unit)}
          options={DOSAGE_UNITS.map((u) => ({ label: u, value: u }))}
          customPlaceholder={t(LocalizedStrings.product.fields.customUnit)}
        />

        {isCreate && (
          <>
            <ChoiceField
              control={control}
              choiceName="deliveryFormChoice"
              customName="deliveryFormCustom"
              choice={deliveryFormChoice}
              label={t(LocalizedStrings.product.fields.deliveryForm)}
              options={DELIVERY_FORMS.map((v) => ({
                label: t(LocalizedStrings.product.forms[v]),
                value: v,
              }))}
              customPlaceholder={t(LocalizedStrings.product.fields.customForm)}
            />
            <ChoiceField
              control={control}
              choiceName="targetMarketChoice"
              customName="targetMarketCustom"
              choice={targetMarketChoice}
              label={t(LocalizedStrings.product.fields.targetMarket)}
              options={TARGET_MARKETS.map((m) => ({ label: m, value: m }))}
              customPlaceholder={t(LocalizedStrings.product.fields.customMarket)}
            />
            <Input
              label={t(LocalizedStrings.product.fields.category)}
              control={control}
              name="category"
              inputStyle={{ height: verticalScale(50) }}
              rules={{ maxLength: 100 }}
              placeholder={t(LocalizedStrings.product.fields.category)}
            />
            <Input
              label={t(LocalizedStrings.product.fields.barcode)}
              control={control}
              name="barcodeGtin"
              keyboardType="number-pad"
              inputStyle={{ height: verticalScale(50) }}
              rules={{
                validate: (v) =>
                  !String(v ?? "").trim() ||
                  /^\d{8,14}$/.test(String(v).trim()) ||
                  t(LocalizedStrings.product.fields.barcodeInvalid),
              }}
              placeholder="0123456789012"
            />
          </>
        )}

        <Select
          control={control}
          inputStyle={{ height: verticalScale(50) }}
          label={t(LocalizedStrings.common.type)}
          name="type"
          options={[
            {
              label: t(LocalizedStrings.product.visibility.private),
              value: "private",
            },
            {
              label: t(LocalizedStrings.product.visibility.public),
              value: "public",
            },
          ]}
        />
        <Input
          control={control}
          name="description"
          label={t(LocalizedStrings.logs.description)}
          placeholder={t(LocalizedStrings.logs.description)}
          multiline
        />
      </View>

      {/* Add Product Button */}
      <Button
        title={
          item ? t(LocalizedStrings.schedule.addProduct.submit) : t(LocalizedStrings.common.create)
        }
        onPress={handleSubmit(handleAddProduct)}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={themedStyles.modalPrimaryButton}
        fullWidth
      />
    </View>
  );
};

export default AddProduct;

// ============================================
// Styles
// ============================================

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    productName: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      lineHeight: verticalScale(24),
      fontSize: moderateScale(20),
      fontWeight: "bold",
    },
    dualFieldRow: {
      flexDirection: "row",
      gap: theme.spacing.smd,
      flexWrap: "wrap",
      marginBottom: theme.spacing.lgx,
    },
    counterBlock: {
      gap: verticalScale(10),
      flex: 1,
    },
    counterLabel: {
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
      fontSize: moderateScale(16),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "medium",
      lineHeight: verticalScale(22),
    },
    counterInput: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: theme.spacing.smd,
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.smd,
      paddingVertical: theme.spacing.sm,
    },
    counterValue: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "medium",
      lineHeight: verticalScale(16),
    },
    counterControls: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.xs,
    },
    counterButton: {
      aspectRatio: 1,
      height: verticalScale(24),
      borderRadius: moderateScale(18),
      backgroundColor: theme.colors.white,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
    },
    counterButtonAccent: {
      backgroundColor: theme.colors.primary.main,
      borderColor: theme.colors.primary.main,
    },
    modalPrimaryButton: {
      backgroundColor: theme.colors.primary.main,
      height: verticalScale(60),
      borderRadius: 999,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.colors.primary.main,
      shadowOffset: { width: 0, height: verticalScale(4) },
      shadowOpacity: 0.25,
      shadowRadius: moderateScale(4),
      elevation: 5,
      fontFamily: fontFamily.gascogneSerial.regular,
    },
  });
