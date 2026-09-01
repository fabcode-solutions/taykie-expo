import { StyleSheet, Pressable, TouchableOpacity, View, Alert } from "react-native";
import crossPlatformAlert from "@/utils/crossPlatformAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText, ThemeView } from "@/components";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useLanguageStore, SUPPORTED_LANGUAGES } from "@/stores/languageStore";
import React, { useCallback, useMemo } from "react";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useAuthStore } from "@/stores/authStore";
import { Loader } from "@/components/shared/loader";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { AlertPresets } from "@/utils/alert";
import { useAlert } from "@/provider/AlertProvider";

export default function AccountSettingsScreen() {
  const { t } = useTranslation();
  const alert = useAlert();
  const theme = useTheme();
  const router = useRouter();
  const { deleteAccount, restoreAccount, isLoading, user } = useAuthStore();
  const { selectedLanguage, setLanguage } = useLanguageStore();
  const [showLangPicker, setShowLangPicker] = React.useState(false);
  const isAccountExists = useMemo(() => user?.deletedAt === null, [user]);
  const handleDeleteAccount = () => {
    crossPlatformAlert(
      t(LocalizedStrings.settings.deleteAccount),
      t(LocalizedStrings.settings.deleteAccountConfirmMessage),
      [
        {
          text: t(LocalizedStrings.common.cancel),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: isAccountExists
            ? t(LocalizedStrings.settings.deleteAccount)
            : t(LocalizedStrings.settings.restoreAccount),
          style: "destructive",
          onPress: deleteUserAccount,
        },
      ],
    );
  };

  const deleteUserAccount = useCallback(async () => {
    try {
      const message = await deleteAccount();
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [t]);

  const restoreUserAccount = useCallback(async () => {
    try {
      const message = await restoreAccount();
      alert.show(AlertPresets.success(t(LocalizedStrings.common.success), message));
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, [t]);

  return (
    <>
      {isLoading && <Loader />}
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
        <ThemeView style={styles.container} padded="lg">
          <ThemeView style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="arrow-back-outline"
                size={moderateScale(24)}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
            <ThemeText variant="manrope.body1" style={[styles.headerTitle, { fontWeight: "600" }]}>
              {t(LocalizedStrings.settings.account)}
            </ThemeText>
            <ThemeView style={styles.headerSpacer} />
          </ThemeView>

          {/* Language selection */}
          <ThemeView
            style={[styles.section, { backgroundColor: theme.colors.background.paper }]}
            rounded="md"
          >
            <Pressable style={styles.settingItem} onPress={() => setShowLangPicker((s) => !s)}>
              <ThemeView style={styles.settingContent}>
                <Ionicons
                  name="language-outline"
                  size={moderateScale(22)}
                  color={theme.colors.primary.main}
                />
                <ThemeText style={styles.settingText}>
                  {(() => {
                    const label = t("settings.language");
                    return label === "settings.language" ? "Idioma" : label;
                  })()}
                </ThemeText>
              </ThemeView>
              <ThemeText variant="manrope.body2" style={{ color: theme.colors.text.secondary }}>
                {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.label ||
                  selectedLanguage}
              </ThemeText>
            </Pressable>

            {showLangPicker && (
              <View
                style={{
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.border,
                }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.code}
                    style={[styles.settingItem, { paddingLeft: scale(48) }]}
                    onPress={() => {
                      setLanguage(lang.code);
                      setShowLangPicker(false);
                    }}
                  >
                    <ThemeText style={styles.settingText}>{lang.label}</ThemeText>
                    {selectedLanguage === lang.code && (
                      <Ionicons
                        name="checkmark"
                        size={moderateScale(20)}
                        color={theme.colors.primary.main}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </ThemeView>

          <ThemeView
            style={[
              styles.section,
              styles.dangerSection,
              { backgroundColor: theme.colors.background.paper },
            ]}
            rounded="md"
          >
            <Pressable
              style={[styles.settingItem, { borderBottomColor: "transparent" }]}
              onPress={isAccountExists ? handleDeleteAccount : restoreUserAccount}
            >
              <ThemeView style={styles.settingContent}>
                <Ionicons
                  name={isAccountExists ? "trash-outline" : "refresh-outline"}
                  size={moderateScale(24)}
                  color={theme.colors.error.main}
                />
                <ThemeText style={[styles.settingText, { color: theme.colors.error.main }]}>
                  {isAccountExists ? t(LocalizedStrings.settings.deleteAccount) : "Restore Account"}
                </ThemeText>
              </ThemeView>
            </Pressable>
          </ThemeView>
        </ThemeView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(24),
  },
  backButton: {},
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: scale(40),
  },
  section: {
    overflow: "hidden",
    marginBottom: verticalScale(16),
  },
  dangerSection: {},
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: verticalScale(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  settingText: {
    fontSize: moderateScale(16),
  },
});
