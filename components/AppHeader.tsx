import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, type Theme } from "@/theme";
import { ThemeText } from "@/components";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import IconNotifications from "./icons/settings/IconNotifications";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useNotificationStore } from "@/stores/notificationStore";

const AppHeader = ({ showGreeting = false }: { showGreeting?: boolean }) => {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const themedStyles = React.useMemo(() => createStyles(theme), [theme]);

  const displayName =
    user?.firstName && user.firstName.trim().length > 0
      ? user.firstName
      : (user?.email?.split("@")[0] ?? "");

  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleProfile = React.useCallback(() => {
    router.push("/profile/profile");
  }, [router]);

  const greetingPrefix = showGreeting ? `${t(LocalizedStrings.home.greeting)} ` : "";
  const headerDisplayText = `${greetingPrefix}${displayName}`;

  return (
    <View style={themedStyles.headerRow}>
      <View style={themedStyles.headerText}>
        <ThemeText variant="gs.h2" style={themedStyles.greeting}>
          {headerDisplayText}
        </ThemeText>
        <ThemeText variant="manrope.subtitle" style={themedStyles.subGreeting}>
          {t(LocalizedStrings.home.subGreeting)}
        </ThemeText>
      </View>
      <View style={themedStyles.iconsWrapper}>
        <TouchableOpacity onPress={() => router.push("/notification/notifications")}>
          <IconNotifications />
          {unreadCount > 0 ? (
            <View style={themedStyles.notificationLabelView}>
              <Text style={themedStyles.notificationLabel}>{unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleProfile} style={themedStyles.avatarWrapper}>
          <ThemeText variant="manrope.body1Bold" style={themedStyles.avatarInitial} uppercase>
            {avatarInitial}
          </ThemeText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AppHeader;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 0,
    },
    iconsWrapper: {
      flexDirection: "row",
      gap: scale(12),
      alignItems: "center",
    },
    headerText: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    greeting: {
      lineHeight: verticalScale(28),
      color: theme.colors.text.primary,
    },
    subGreeting: {
      display: "none",
      marginTop: theme.spacing.xs,
      color: theme.colors.text.secondary,
    },
    avatarWrapper: {
      aspectRatio: 1,
      height: verticalScale(30),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      justifyContent: "center",
      alignItems: "center",
      elevation: 0,
    },
    avatarInitial: {
      color: theme.colors.text.primary,
    },

    notificationLabel: {
      fontSize: moderateScale(12),
      color: theme.colors.white,
      textAlign: "center",
    },

    notificationLabelView: {
      position: "absolute",
      borderRadius: 999,
      backgroundColor: theme.colors.error.main,
      top: -verticalScale(12),
      right: -scale(10),
      justifyContent: "center",
      alignItems: "center",
      minWidth: verticalScale(18),
      height: verticalScale(18),
    },
  });
