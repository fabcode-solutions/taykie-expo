import { fontFamily, Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import React, { useMemo } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ActionItemProps {
  onPress: () => void;
  heading: string;
  description?: string;
  leftIcon?: React.ReactElement | null;
  rightIcon?: React.ReactElement | null;
}

const ActionItem = ({ onPress, heading, description, leftIcon, rightIcon }: ActionItemProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <View style={styles.leftWrapper}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <View style={styles.wrapper}>
          {heading && <Text style={styles.heading}>{heading}</Text>}
          {description && (
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
              <Text numberOfLines={2} style={styles.description}>
                {description}
              </Text>
            </View>
          )}
        </View>
      </View>
      {rightIcon && <View>{rightIcon}</View>}
    </TouchableOpacity>
  );
};

export default ActionItem;
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    action: {
      flexDirection: "row",
      padding: verticalScale(10),
      paddingRight: scale(14),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      alignItems: "center",
      borderColor: theme.colors.divider,
      borderWidth: scale(1),
      justifyContent: "space-between",
    },
    leftWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
    },
    leftIcon: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 999,
      aspectRatio: 1,
      height: verticalScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
    wrapper: { maxWidth: Dimensions.get("window").width - 130 },
    heading: {
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "500" as const,
      fontSize: moderateScale(16),
      color: theme.colors.text.primary,
    },
    description: {
      fontFamily: fontFamily.manrope.regular,
      fontWeight: "400" as const,
      fontSize: moderateScale(14),
      color: theme.colors.primary.dark,
      marginTop: verticalScale(2),
      flexShrink: 1,
    },
  });
