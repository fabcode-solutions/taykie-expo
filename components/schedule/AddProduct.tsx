import React, { useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { fontFamily, useTheme, type Theme } from "@/theme";
import { ThemeText } from "@/components";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useForm } from "react-hook-form";
import { Input } from "../ui/TextInput/input";
import Select from "../ui/Select/select";
import { SearchItem } from "@/types/search.types";
// ============================================
// Types
// ============================================

export interface ProductDetails {
  productName?: string | null;
  dosageCount: number;
  strength: number;
  type?: string | null;
  description?: string | null;
}
interface AddProductProps {
  item: SearchItem | null;
  productName?: string | null;
  initialDosage?: number;
  initialStrength?: number;
  onAddProduct?: (product: ProductDetails) => void;
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
              accessibilityLabel={`Decrease ${label}`}
            >
              <Ionicons name="remove" size={moderateScale(16)} color={theme.colors.divider} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onIncrement}
              style={[themedStyles.counterButton, themedStyles.counterButtonAccent]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Increase ${label}`}
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

// ============================================
// Main Component
// ============================================

const AddProduct: React.FC<AddProductProps> = ({
  item,
  initialDosage = 1,
  initialStrength = 500,
  onAddProduct,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);
  const { control, watch, setValue, handleSubmit } = useForm<ProductDetails>({
    mode: "onChange",
    reValidateMode: "onSubmit",
    defaultValues: {
      productName: item?.name,
      description: item?.description,
      type: item?.type ?? "private",
      dosageCount: initialDosage,
      strength: initialStrength,
    },
  });

  const { dosageCount, strength } = watch();

  // Dosage handlers with useCallback for performance
  const handleDecrementDosage = useCallback(() => {
    setValue("dosageCount", Math.max(1, dosageCount - 1));
  }, [dosageCount]);

  const handleIncrementDosage = useCallback(() => {
    setValue("dosageCount", dosageCount + 1);
  }, [dosageCount]);

  // Strength handlers with useCallback for performance
  const handleDecrementStrength = useCallback(() => {
    setValue("strength", Math.max(100, strength - 100));
  }, [strength]);

  const handleIncrementStrength = useCallback(() => {
    setValue("strength", strength + 100);
  }, [strength]);

  // Add product handler
  const handleAddProduct = useCallback(
    (data: ProductDetails) => {
      onAddProduct?.(data);
    },
    [dosageCount, strength, onAddProduct, item],
  );

  return (
    <View style={themedStyles.container}>
      {/* Product Name Header (Optional) */}
      <ThemeText variant="gs.h2" style={themedStyles.productName}>
        {item?.productName}
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
              value: /^[A-Za-z\s]+$/,
              message: t(LocalizedStrings.errors.validation.name.invalid),
            },
          }}
          placeholder={t(LocalizedStrings.product.add_name)}
        />

        <CounterField
          label={t(LocalizedStrings.schedule.addProduct.dosage)}
          value={dosageCount}
          unit={t(LocalizedStrings.home.extras.tablet)}
          onIncrement={handleIncrementDosage}
          onDecrement={handleDecrementDosage}
          theme={theme}
        />

        <CounterField
          label={t(LocalizedStrings.schedule.addProduct.strength)}
          value={strength}
          unit={t(LocalizedStrings.home.extras.mg)}
          onIncrement={handleIncrementStrength}
          onDecrement={handleDecrementStrength}
          theme={theme}
        />

        <Select
          control={control}
          inputStyle={{ height: verticalScale(50) }}
          label={t(LocalizedStrings.common.type)}
          name="type"
          options={[
            {
              label: t(LocalizedStrings.groups.private),
              value: "private",
            },
            {
              label: t(LocalizedStrings.groups.public),
              value: "public",
            },
          ]}
        />
        <Input
          control={control}
          name="description"
          label="Description"
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
      lineHeight: verticalScale(5),
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
