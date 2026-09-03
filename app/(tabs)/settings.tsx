import { StyleSheet, View, Image, Text, TouchableOpacity, ScrollView } from "react-native";
import crossPlatformAlert from "@/utils/crossPlatformAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import React, { useCallback, useMemo, useState } from "react";
import ActionItem from "@/components/settings/ActionItem";
import { RoutePath, SETTINGS } from "@/data/settings";
import DeleteSchedule from "@/components/schedule/DeleteSchedule";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accountDelete, setAccountDelete] = useState(false);
  // DeleteSchedule's own BlurModal closes itself ~2500ms after onYes resolves.
  // Navigating away immediately would replace the screen while that modal's
  // native surface is still open/transitioning — defer the navigation until
  // its onClose (handleCloseDelete) actually fires.
  const logoutPendingRef = React.useRef(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((state) => state.user);

  const displayName = useMemo(() => {
    if (!user) return null;
    return user.firstName || (user.email || "").split("@")[0];
  }, [user]);

  const avatarInitial = displayName?.charAt(0).toUpperCase();
  const handleProfile = React.useCallback(() => {
    // TODO: Navigate to products screen
    router.push("/account-settings");
  }, [router]);

  const handleDelete = useCallback(() => {
    setAccountDelete((prev) => !prev);
  }, []);
  const handleCloseDelete = useCallback(() => {
    setAccountDelete((prev) => !prev);
    if (logoutPendingRef.current) {
      logoutPendingRef.current = false;
      router.replace("/(auth)/auth-start");
    }
  }, [router]);
  const performLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
      logoutPendingRef.current = true;
    } catch (error) {
      crossPlatformAlert(t(LocalizedStrings.common.error), error.message, [
        { text: t(LocalizedStrings.common.ok) },
      ]);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(80) }}
      >
        <View style={[styles.headerRow]}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            {t(LocalizedStrings.settings.title)}
          </ThemeText>
        </View>
        <View style={styles.profileWrapper}>
          <TouchableOpacity onPress={handleProfile} style={styles.avatar}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarUrl} />
            ) : (
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            )}
          </TouchableOpacity>
          <View style={{ gap: verticalScale(10) }}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.editProfileBtnWrapper}>
              <TouchableOpacity
                style={styles.editProfile}
                onPress={() => router.push("/profile/edit-profile")}
              >
                <Text style={styles.editProfileText}>
                  {t(LocalizedStrings.profile.editProfile)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* Appearance */}
        {Object.keys(SETTINGS).map((key) => {
          return (
            <View style={styles.settingItemWrapper} key={key}>
              <Text style={styles.settingHeader}>{t(`settings.${key}.title`)}</Text>
              <View style={styles.section}>
                {SETTINGS[key].map((item, index) => (
                  <ActionItem
                    key={index}
                    heading={t(item.heading)}
                    description={t(item.description)}
                    leftIcon={item.leftIcon}
                    rightIcon={item.rightIcon}
                    onPress={() => {
                      if (item.action === "logout") {
                        handleDelete();
                      } else {
                        router.push(item.action as RoutePath);
                      }
                    }}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {accountDelete && (
        <DeleteSchedule
          heading={t(LocalizedStrings.common.logout)}
          content={t(LocalizedStrings.settings.logoutConfirmMessage)}
          onClose={handleCloseDelete}
          onYes={performLogout}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: verticalScale(16),
      paddingBottom: verticalScale(64),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      marginBottom: verticalScale(24),
      alignItems: "center",
    },
    section: {
      gap: verticalScale(15),
    },
    avatar: {
      aspectRatio: 1,
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarUrl: {
      aspectRatio: 1,
      height: verticalScale(60),
      objectFit: "cover",
      borderRadius: 999,
    },
    avatarInitial: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
    },
    profileWrapper: {
      flexDirection: "row",
      gap: scale(15),
      alignItems: "center",
    },
    profileName: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(16),
      fontWeight: "700" as const,
      fontFamily: fontFamily.manrope.bold,
      maxWidth: "90%",
    },
    editProfileBtnWrapper: {
      flexDirection: "row",
    },
    editProfile: {
      paddingVertical: 1,
      paddingHorizontal: scale(14),
      borderRadius: moderateScale(5),
      backgroundColor: theme.colors.primary.main,
    },
    editProfileText: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(14),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
      textAlign: "center",
    },
    settingItemWrapper: { marginTop: verticalScale(20), gap: verticalScale(10) },
    settingHeader: {
      color: theme.colors.text.primary,
      fontSize: moderateScale(18),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
  });
