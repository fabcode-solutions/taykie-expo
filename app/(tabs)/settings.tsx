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
import { Skeleton } from "@/components/ui/Skeleton";

type ActionItemProps = React.ComponentProps<typeof ActionItem>;

interface SettingsRowProps {
  heading: string;
  description: string;
  leftIcon: ActionItemProps["leftIcon"];
  rightIcon: ActionItemProps["rightIcon"];
  action: string;
  onAction: (action: string) => void;
}

// Memoized so the whole settings list doesn't re-render on unrelated state
// changes (logout modal toggle, isLoggingOut, ...).
const SettingsRow = React.memo(function SettingsRow({
  heading,
  description,
  leftIcon,
  rightIcon,
  action,
  onAction,
}: SettingsRowProps) {
  const handlePress = useCallback(() => onAction(action), [onAction, action]);
  return (
    <ActionItem
      heading={heading}
      description={description}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      onPress={handlePress}
    />
  );
});

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
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
  const handleEditProfile = useCallback(() => router.push("/profile/edit-profile"), [router]);
  const handleAction = useCallback(
    (action: string) => {
      if (action === "logout") {
        handleDelete();
      } else {
        router.push(action as RoutePath);
      }
    },
    [handleDelete, router],
  );

  const sections = useMemo(
    () =>
      Object.keys(SETTINGS).map((key) => (
        <View style={styles.settingItemWrapper} key={key}>
          <Text style={styles.settingHeader}>{t(`settings.${key}.title`)}</Text>
          <View style={styles.section}>
            {SETTINGS[key].map((item, index) => (
              <SettingsRow
                key={index}
                heading={t(item.heading)}
                description={t(item.description)}
                leftIcon={item.leftIcon}
                rightIcon={item.rightIcon}
                action={item.action}
                onAction={handleAction}
              />
            ))}
          </View>
        </View>
      )),
    [t, styles, handleAction],
  );

  const performLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
      logoutPendingRef.current = true;
    } catch (error) {
      crossPlatformAlert(
        t(LocalizedStrings.common.error),
        error instanceof Error ? error.message : String(error),
        [{ text: t(LocalizedStrings.common.ok) }],
      );
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
        {user ? (
          <View style={styles.profileWrapper}>
            <TouchableOpacity onPress={handleProfile} style={styles.avatar}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarUrl} />
              ) : (
                <Text style={styles.avatarInitial}>{avatarInitial}</Text>
              )}
            </TouchableOpacity>
            <View style={{ gap: verticalScale(10) }}>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={styles.editProfileBtnWrapper}>
                <TouchableOpacity style={styles.editProfile} onPress={handleEditProfile}>
                  <Text style={styles.editProfileText}>
                    {t(LocalizedStrings.profile.editProfile)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.profileWrapper}>
            <Skeleton width={verticalScale(60)} height={verticalScale(60)} borderRadius={999} />
            <View style={{ gap: verticalScale(10) }}>
              <Skeleton width={scale(140)} height={moderateScale(16)} />
              <Skeleton
                width={scale(90)}
                height={moderateScale(22)}
                borderRadius={moderateScale(5)}
              />
            </View>
          </View>
        )}
        {/* Appearance */}
        {sections}
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
      paddingBottom: verticalScale(100),
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
