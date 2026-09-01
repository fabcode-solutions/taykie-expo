import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { SettingItem } from "@/data/settings";
import IconForward from "@/components/icons/settings/IconForward";
import ActionItem from "@/components/settings/ActionItem";
import Switch from "@/components/ui/Switch";
import IconLock from "@/components/icons/settings/IconLock";
import NotificationBottomDrawer from "@/components/settings/NotificationBottomDrawer";
import IconDelete from "@/components/icons/settings/IconDelete";
import IconKey from "@/components/icons/settings/IconKey";
import { useAuthStore } from "@/stores/authStore";
import DeleteSchedule from "@/components/schedule/DeleteSchedule";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import IconBoard from "@/components/icons/IconBoard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { useInsightStore } from "@/stores/insightStore";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function DataPrivacyScreen() {
  const { t } = useTranslation();
  const alert = useAlert();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [dataPrivacy, setDataPrivacy] = useState({
    appLock: true,
  });
  const { deleteAccount } = useAuthStore();
  const { fetchDataToExport } = useInsightStore();
  const [dataPrivacyIsOpen, setDataPrivacyIsOpen] = useState(false);
  const [accountDelete, setAccountDelete] = useState(false);
  const handleDataPrivacy = useCallback((action: boolean, key: keyof typeof dataPrivacy) => {
    setDataPrivacy((prev) => ({
      ...prev,
      [key]: !action,
    }));
  }, []);

  const deleteUserAccount = useCallback(async () => {
    try {
      const message = await deleteAccount();
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [accountDelete, t]);

  const handleDataPrivacyClose = useCallback(() => {
    setDataPrivacyIsOpen((prev) => !prev);
  }, [setDataPrivacyIsOpen]);
  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);

  const fetchExportedData = useCallback(async () => {
    try {
      const data = await fetchDataToExport();
      return data;
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const exportAsJSON = async () => {
    try {
      const dataToexport = await fetchExportedData();

      const jsonString = JSON.stringify(dataToexport, null, 2);

      const fileUri = FileSystem.documentDirectory + "data_export.json";

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
      alert.show(
        AlertPresets.success(
          t(LocalizedStrings.common.success),
          t(LocalizedStrings.insights.export.json),
        ),
      );
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  };

  const NOTIFICATIONS: Record<string, SettingItem> = useMemo(
    () => ({
      change_password: {
        leftIcon: <IconKey />,
        heading: "Change Profile Password",
        action: "/settings/change-password",
        description: "Change the user’s profile password.",
        rightIcon: <IconForward />,
      },
      appLock: {
        leftIcon: <IconLock />,
        heading: "App Lock",
        action: "",
        description: "Use your device’s biometrics for access.",
        rightIcon: (
          <Switch
            style={styles.switch}
            trackColors={{ on: theme.colors.text.primary, off: "#B4B4B4" }}
            onPress={() => handleDataPrivacy(!dataPrivacy.appLock, "appLock")}
            value={dataPrivacy.appLock}
          />
        ),
      },
      request_data: {
        leftIcon: <IconBoard />,
        heading: "Request my data",
        action: "request_data",
        description: "Permanently delete all your Product account.",
        rightIcon: null,
      },
      delete_account: {
        leftIcon: <IconDelete />,
        heading: "Delete My Account & Data",
        action: "delete",
        description: "Permanently delete all your Product account.",
        rightIcon: null,
      },
    }),
    [styles.switch, dataPrivacy.appLock, handleDataPrivacy, theme.colors],
  );

  const handleDelete = useCallback(() => {
    setAccountDelete((prev) => !prev);
  }, []);
  const handleCloseDelete = useCallback(() => {
    setAccountDelete((prev) => !prev);
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
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
            {t(LocalizedStrings.settings.dataPrivacy.title)}
          </ThemeText>
        </View>
        <View style={styles.section}>
          {Object.entries(NOTIFICATIONS).map(([key, item]) => (
            <ActionItem
              key={key}
              heading={t(`settings.dataPrivacy.${key}.title`)}
              description={t(`settings.dataPrivacy.${key}.description`)}
              leftIcon={item.leftIcon}
              rightIcon={item.rightIcon}
              onPress={() => {
                if (item.action === "delete") {
                  handleDelete();
                } else if (item.action === "request_data") {
                  exportAsJSON();
                } else if (item.action) {
                  router.push(item.action as any);
                }
              }}
            />
          ))}
        </View>
      </ScrollView>
      {accountDelete && (
        <DeleteSchedule
          content={t(LocalizedStrings.settings.wantToDeleteAccount)}
          onClose={handleCloseDelete}
          onYes={deleteUserAccount}
        />
      )}
      <NotificationBottomDrawer isVisible={dataPrivacyIsOpen} onClose={handleDataPrivacyClose} />
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
      paddingTop: verticalScale(30),
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
    },
    headerRow: {
      flexDirection: "row",
      marginTop: verticalScale(30),
      alignItems: "center",
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
    section: {
      marginTop: verticalScale(20),
      gap: verticalScale(14),
    },
    switch: {
      width: scale(30),
      height: verticalScale(16),
    },
  });
