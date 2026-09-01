import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { Button } from "@/components/ui/button";
import Svg, { Path } from "react-native-svg";
import { useAuthStore } from "@/stores/authStore";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function PairDeviceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((state) => state.user);

  const displayName = React.useMemo(() => {
    if (!user) return null;
    if (user.firstName) return user.firstName;
    const email = user.email || "";
    return email.split("@")[0];
  }, [user, t]);

  const avatarInitial = displayName?.charAt(0).toUpperCase();
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <SafeAreaView>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
          <View>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <View style={styles.backButtonInner}>
                <IconBackArrow />
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.headerRow]}>
            <ThemeText variant="manrope.h2" style={styles.header}>
              {t(LocalizedStrings.device.pairDevice)}
            </ThemeText>
          </View>
          <View style={[styles.descriptionRow]}>
            <Text style={[styles.description]}>
              {t(LocalizedStrings.device.connectViaBluetooth)}
            </Text>
          </View>
          <View style={styles.iconWrapper}>
            <View style={styles.iconC1}>
              <View style={styles.iconC2}>
                <Svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                  <Path
                    d="M17.5 17.5L42.5 42.5L30 55V5L42.5 17.5L17.5 42.5"
                    stroke={theme.colors.primary.main}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>
          </View>
          <Text style={styles.searching}>Searching for nearby devices...</Text>
          <Text style={styles.selectedDevice}>PillBox_1015</Text>
          <View style={{ marginTop: verticalScale(30) }}>
            <Button
              title={"Connect"}
              onPress={() => router.push("/device/connected-device")}
              textStyle={{ fontSize: moderateScale(20) }}
              rightIcon={null}
            />
          </View>
          <View style={styles.manuallyWrapper}>
            <Text style={styles.manuallyWrapperText}>
              {t(LocalizedStrings.device.cantFindDevice)}
            </Text>
            <Pressable>
              <Text style={[styles.manuallyWrapperTextBold]}>
                {t(LocalizedStrings.device.enterManually)}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: verticalScale(16),
      paddingTop: verticalScale(30),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      textAlign: "center",
      margin: 0,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
      justifyContent: "center",
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
    descriptionRow: {
      maxWidth: scale(275),
      marginHorizontal: "auto",
      marginTop: verticalScale(10),
      justifyContent: "center",
      alignItems: "center",
    },
    description: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
      textAlign: "center",
    },
    iconWrapper: {
      marginTop: verticalScale(30),
      justifyContent: "center",
      alignItems: "center",
    },
    iconC1: {
      aspectRatio: 1,
      height: verticalScale(120),
      borderRadius: 999,
      backgroundColor: "#DDDDDD",
      justifyContent: "center",
      alignItems: "center",
    },
    iconC2: {
      aspectRatio: 1,
      height: verticalScale(90),
      borderRadius: 999,
      backgroundColor: "#B4B4B4",
      justifyContent: "center",
      alignItems: "center",
    },
    searching: {
      fontSize: moderateScale(14),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
      textAlign: "center",
      marginTop: verticalScale(20),
    },
    selectedDevice: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.primary.dark,
      textAlign: "center",
      marginTop: verticalScale(20),
    },
    manuallyWrapper: {
      flexDirection: "row",
      gap: scale(4),
      justifyContent: "center",
      marginTop: verticalScale(20),
    },
    manuallyWrapperText: {
      fontSize: moderateScale(moderateScale(14)),
      fontWeight: "400" as const,
      fontFamily: fontFamily.manrope.regular,
      color: theme.colors.primary.dark,
    },
    manuallyWrapperTextBold: {
      fontSize: 14,
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      color: theme.colors.text.primary,
    },
  });
