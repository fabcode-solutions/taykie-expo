import React from "react";
import { StyleSheet, View, ImageBackground, TouchableOpacity, Image, Platform } from "react-native";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeButton, ThemeText, SafeAreaScreen, ThemeStatusBar } from "@/components";
import { useTranslation } from "react-i18next";
import { Images } from "@/assets";
import { startAppleNativeAndExchange, startGoogleNativeAndExchange } from "@/services/api/auth";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import Ionicons from "@expo/vector-icons/Ionicons";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { Button } from "@/components/ui/button";

function AuthStart() {
  const isFocused = useIsFocused();
  const theme = useTheme();
  const { t } = useTranslation();
  const alert = useAlert();
  const [socialLoading, setSocialLoading] = React.useState<"google" | "apple" | null>(null);
  const themedStyles = React.useMemo(() => createThemedStyles(theme), [theme]);

  const handleCreateAccount = () => {
    router.push({
      pathname: "/(auth)/signup",
      params: { from: "auth" },
    });
  };

  const handleLogin = () => {
    router.push({
      pathname: "/(auth)/login",
      params: { from: "auth" },
    });
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    try {
      await startGoogleNativeAndExchange();

      const isOnboardingComplete = useOnboardingStore.getState().isOnboardingComplete;

      if (isOnboardingComplete) {
        router.replace("/(tabs)");
      } else {
        router.push("/(onboarding)/country-language");
      }
    } catch (err) {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.auth.authStart.loginFailedTitle), err.message),
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading("apple");

    try {
      await startAppleNativeAndExchange();
      const isOnboardingComplete = useOnboardingStore.getState().isOnboardingComplete;

      if (isOnboardingComplete) {
        router.replace("/(tabs)");
      } else {
        router.push("/(onboarding)/country-language");
      }
    } catch (err) {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.auth.authStart.loginFailedTitle), err.message),
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSkipOffline = () => {
    router.push("/(tabs)");
  };

  return (
    <ImageBackground
      source={Images.authStart}
      style={staticStyles.background}
      resizeMode="cover"
      blurRadius={1}
      imageStyle={staticStyles.backgroundImage}
    >
      {isFocused && <ThemeStatusBar style="light" translucent backgroundColor="transparent" />}
      <View style={staticStyles.overlay} />
      <SafeAreaScreen withBackground={false} style={staticStyles.safeArea}>
        <View style={themedStyles.container}>
          <View style={themedStyles.bottomOverlay}>
            <ThemeButton
              title={t(LocalizedStrings.auth.authStart.createNewAccount)}
              onPress={handleCreateAccount}
              style={[themedStyles.ctaCreate, theme.shadows[2]]}
              textStyle={themedStyles.ctaCreateText}
              fullWidth
            />

            <ThemeText variant="manrope.body" style={themedStyles.memberText}>
              {t(LocalizedStrings.auth.authStart.alreadyMember)}
            </ThemeText>

            <ThemeButton
              title={t(LocalizedStrings.auth.login.button)}
              onPress={handleLogin}
              style={[themedStyles.ctaLogin, theme.shadows[2]]}
              textStyle={themedStyles.ctaLoginText}
              fullWidth
            />

            <View style={themedStyles.dividerContainer}>
              <View style={themedStyles.dividerLine} />
              <ThemeText style={themedStyles.dividerText}>
                {t(LocalizedStrings.auth.authStart.or)}
              </ThemeText>
              <View style={themedStyles.dividerLine} />
            </View>

            <View style={themedStyles.socialRow}>
              {/* Google Login */}
              <Button
                onPress={handleGoogleLogin}
                variant="outline"
                textStyle={themedStyles.googleButtonText}
                title={t(LocalizedStrings.auth.authStart.social.google)}
                style={{ ...themedStyles.googleButton, ...themedStyles.socialButton }}
                loading={socialLoading === "google"}
                disabled={socialLoading !== null}
                leftIcon={
                  <Image
                    style={{
                      aspectRatio: 1,
                      height: verticalScale(20),
                    }}
                    source={Images.google_icon}
                  />
                }
              />

              {/* Apple Login */}
              {Platform.OS === "ios" && (
                <Button
                  loading={socialLoading === "apple"}
                  disabled={socialLoading !== null}
                  title={t(LocalizedStrings.auth.authStart.social.apple)}
                  onPress={handleAppleLogin}
                  style={{ ...themedStyles.googleButton, ...themedStyles.socialButton }}
                  variant="outline"
                  textStyle={themedStyles.googleButtonText}
                  leftIcon={
                    <Ionicons
                      name="logo-apple"
                      size={moderateScale(24)}
                      color={theme.colors.text.primary}
                    />
                  }
                />
              )}
            </View>

            <TouchableOpacity
              onPress={handleSkipOffline}
              activeOpacity={0.8}
              style={themedStyles.skipTouchable}
            >
              <ThemeText style={themedStyles.skipText}>
                {t(LocalizedStrings.auth.authStart.skipOffline)}
              </ThemeText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaScreen>
    </ImageBackground>
  );
}

const createThemedStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "flex-end",
    },
    bottomOverlay: {
      width: "100%",
      alignSelf: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl * 1.1,
    },
    ctaCreate: {
      borderRadius: 999,
      height: verticalScale(60),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background.default,
    },
    ctaCreateText: {
      ...theme.typography.gs.button,
      color: theme.colors.text.primary,
      letterSpacing: 0.3,
    },
    memberText: {
      textAlign: "center",
      color: theme.colors.white,
      marginVertical: theme.spacing.md,
    },
    ctaLogin: {
      borderRadius: 999,
      height: verticalScale(60),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary.main,
    },
    ctaLoginText: {
      ...theme.typography.gs.button,
      color: theme.colors.text.primary,
      lineHeight: verticalScale(24),
      letterSpacing: 0.3,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.lg,
      paddingHorizontal: scale(70),
    },
    dividerLine: {
      flex: 1,
      height: verticalScale(1),
      backgroundColor: theme.colors.white,
    },
    dividerText: {
      ...theme.typography.manrope.subtitle2,
      color: theme.colors.white,
      marginHorizontal: theme.spacing.sm,
    },
    socialRow: {
      flexDirection: "row",
      marginTop: theme.spacing.md,
      alignItems: "center",
      gap: scale(10),
    },
    socialButton: {
      flex: 1,
    },
    socialButtonText: {
      ...theme.typography.manrope.button_xl,
      color: theme.colors.slateCharcoal,
    },
    skipTouchable: {
      marginTop: theme.spacing.lg,
    },
    skipText: {
      ...theme.typography.manrope.subtitle,
      color: theme.colors.white,
      textAlign: "center",
    },

    googleButton: {
      backgroundColor: theme.colors.white,
      minHeight: verticalScale(50),
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 0,
    },
    googleButtonText: {
      fontWeight: 500,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.manrope.brandBody.fontFamily,
    },
  });

const staticStyles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    right: -scale(350),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  safeArea: {
    flex: 1,
  },
  socialIcon: {
    aspectRatio: 1,
    height: verticalScale(20),
    resizeMode: "contain",
    marginRight: scale(8),
  },
});

export default AuthStart;
