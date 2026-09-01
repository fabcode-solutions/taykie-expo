import React from "react";
import { StyleSheet, View, ImageBackground, Image } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeButton, ThemeText, SafeAreaScreen, ThemeStatusBar } from "@/components";
import { Images } from "@/assets";
import { scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { t } from "i18next";

export default function WelcomeScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const handleGetStarted = () => {
    router.push("/(auth)/auth-start");
  };

  return (
    <ImageBackground
      source={Images.welcomeScreen}
      style={staticStyles.background}
      resizeMode="cover"
      blurRadius={1}
    >
      <ThemeStatusBar style="light" translucent backgroundColor="transparent" />
      <View style={staticStyles.overlay} />
      <SafeAreaScreen withBackground={false} style={staticStyles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            <ThemeText variant="manrope.subtitle" style={styles.kicker} uppercase align="center">
              {t(LocalizedStrings.auth.welcome.kicker)}
            </ThemeText>
            <Image style={styles.logo} source={Images.dark_logo} />
            <ThemeText variant="manrope.h3" style={styles.tagline} align="center">
              {t(LocalizedStrings.auth.welcome.tagline)}
            </ThemeText>
          </View>

          <View style={styles.actions}>
            <ThemeButton
              title={t(LocalizedStrings.auth.authStart.letsStart)}
              onPress={handleGetStarted}
              style={[styles.primaryCta, theme.shadows[2]]}
              textStyle={styles.primaryCtaText}
              fullWidth
            />
          </View>
        </View>
      </SafeAreaScreen>
    </ImageBackground>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.1,
      justifyContent: "space-between",
    },
    content: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      paddingTop: theme.spacing.xxxl,
      gap: verticalScale(15),
    },
    kicker: {
      color: theme.colors.white,
      letterSpacing: scale(3),
      marginBottom: theme.spacing.sm,
    },
    tagline: {
      color: theme.colors.white,
      marginBottom: theme.spacing.md,
    },
    logo: {
      width: scale(250),
      height: verticalScale(80),
    },
    actions: {
      width: "100%",
    },
    primaryCta: {
      borderRadius: 999,
      height: verticalScale(60),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary.main,
    },
    primaryCtaText: {
      ...theme.typography.gs.button,
      color: theme.colors.slateCharcoal,
      letterSpacing: 0.4,
      lineHeight: verticalScale(24),
    },
  });

const staticStyles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  safeArea: { flex: 1 },
});
