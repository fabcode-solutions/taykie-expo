import React from "react";
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { SvgIcon } from "@/components/SvgIcon";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { useTranslation } from "react-i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export interface BackButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
  iconSize?: number;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  style,
  iconColor,
  iconSize = 16,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t(LocalizedStrings.common.goBack)}
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.colors.primary.main }, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <SvgIcon name="leftCaret" size={iconSize} color={iconColor || theme.colors.black} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    aspectRatio: 1,
    height: verticalScale(40),
    borderRadius: moderateScale(10),
    borderWidth: scale(1),
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
});

export default BackButton;
