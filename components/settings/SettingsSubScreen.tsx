import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemeText } from "@/components";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { fontFamily, Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

type SettingsSubScreenProps = {
  title: string;
  children: React.ReactNode;
};

// Shared shell for the simple settings sub-screens (back button + serif title + scrollable body).
const SettingsSubScreen = ({ title, children }: SettingsSubScreenProps) => {
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: verticalScale(80) }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>
        <ThemeText variant="manrope.h2" style={styles.header}>
          {title}
        </ThemeText>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsSubScreen;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
    },
    header: {
      marginTop: verticalScale(30),
      marginBottom: verticalScale(10),
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
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
  });
