import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import IconBackArrow from "./icons/IconBackArrow";
import { Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

const BackButton = ({ onPress }: { onPress?: () => void }) => {
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const handleBack = React.useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  }, [router]);

  return (
    <View>
      <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
        <View style={styles.backButtonInner}>
          <IconBackArrow />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default BackButton;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
  });
