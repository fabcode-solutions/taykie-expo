import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";

interface MedicationIconProps {
  type: "pill" | "drops" | "tablet" | "capsule" | "injection" | "cream";
  color?: string;
  size?: "small" | "medium" | "large";
  testID?: string;
}

export const MedicationIcon: React.FC<MedicationIconProps> = ({
  type,
  color,
  size = "medium",
  testID,
}) => {
  const theme = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconSize = {
    small: 40,
    medium: 60,
    large: 80,
  }[size];

  const containerSize = {
    small: 60,
    medium: 90,
    large: 120,
  }[size];

  const renderMedicationShape = () => {
    switch (type) {
      case "pill":
      case "tablet":
        return (
          <View
            style={[
              styles.pill,
              {
                width: scale(iconSize * 0.7),
                height: verticalScale(iconSize * 0.4),
                backgroundColor: color ?? theme.colors.warning.main,
              },
            ]}
          />
        );
      case "capsule":
        return (
          <View style={styles.capsuleContainer}>
            <View
              style={[
                styles.capsuleHalf,
                styles.capsuleTop,
                {
                  aspectRatio: 1,
                  height: verticalScale(iconSize * 0.6),
                  backgroundColor: color ?? theme.colors.warning.main,
                },
              ]}
            />
            <View
              style={[
                styles.capsuleHalf,
                styles.capsuleBottom,
                {
                  aspectRatio: 1,
                  height: verticalScale(iconSize * 0.6),
                  backgroundColor: theme.colors.warning.main,
                },
              ]}
            />
          </View>
        );
      case "drops":
        return (
          <View
            style={[
              styles.drop,
              {
                width: scale(iconSize * 0.5),
                height: verticalScale(iconSize * 0.6),
                backgroundColor: color ?? theme.colors.warning.main,
              },
            ]}
          />
        );
      case "injection":
        return (
          <View style={styles.injectionContainer}>
            <View
              style={[
                styles.injectionBody,
                {
                  width: scale(iconSize * 0.8),
                  height: verticalScale(iconSize * 0.2),
                  backgroundColor: color ?? theme.colors.warning.main,
                },
              ]}
            />
            <View
              style={[
                styles.injectionNeedle,
                {
                  width: scale(iconSize * 0.1),
                  height: verticalScale(iconSize * 0.4),
                  backgroundColor: theme.colors.text.secondary,
                },
              ]}
            />
          </View>
        );
      case "cream":
        return (
          <View
            style={[
              styles.cream,
              {
                width: scale(iconSize * 0.7),
                height: verticalScale(iconSize * 0.8),
                backgroundColor: color ?? theme.colors.warning.main,
              },
            ]}
          />
        );
      default:
        return (
          <View
            style={[
              styles.pill,
              {
                width: scale(iconSize * 0.7),
                height: verticalScale(iconSize * 0.4),
                backgroundColor: color ?? theme.colors.warning.main,
              },
            ]}
          />
        );
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          aspectRatio: 1,
          height: verticalScale(containerSize),
        },
      ]}
      testID={testID}
    >
      <View style={styles.iconWrapper}>{renderMedicationShape()}</View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderRadius: 999,
      backgroundColor: theme.colors.background.elevated,
      justifyContent: "center",
      alignItems: "center",
      ...theme.shadows[2],
    },
    iconWrapper: {
      justifyContent: "center",
      alignItems: "center",
    },
    pill: {
      borderRadius: moderateScale(20),
      transform: [{ rotate: "45deg" }],
    },
    capsuleContainer: {
      flexDirection: "column",
      alignItems: "center",
      transform: [{ rotate: "45deg" }],
    },
    capsuleHalf: {
      borderTopLeftRadius: moderateScale(15),
      borderTopRightRadius: moderateScale(15),
    },
    capsuleTop: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    capsuleBottom: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: moderateScale(15),
      borderBottomRightRadius: moderateScale(15),
    },
    drop: {
      borderTopLeftRadius: moderateScale(20),
      borderTopRightRadius: moderateScale(20),
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: moderateScale(20),
      transform: [{ rotate: "45deg" }],
    },
    injectionContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    injectionBody: {
      borderRadius: moderateScale(4),
      marginBottom: verticalScale(2),
    },
    injectionNeedle: {
      borderRadius: moderateScale(1),
    },
    cream: {
      borderTopLeftRadius: moderateScale(4),
      borderTopRightRadius: moderateScale(4),
      borderBottomLeftRadius: moderateScale(8),
      borderBottomRightRadius: moderateScale(8),
    },
  });
