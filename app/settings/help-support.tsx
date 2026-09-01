import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeText } from "@/components";
import { useTranslation } from "react-i18next";
import { fontFamily, Theme, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import IconBackArrow from "@/components/icons/IconBackArrow";
import { SettingItem } from "@/data/settings";
import ActionItem from "@/components/settings/ActionItem";
import IconFaq from "@/components/icons/settings/IconFaq";
import IconContact from "@/components/icons/settings/IconContact";
import IconPaperBoard from "@/components/icons/settings/IconPaperBoard";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function HelpSupportScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const NOTIFICATIONS: SettingItem[] = useMemo(
    () => [
      {
        leftIcon: <IconFaq />,
        heading: "Frequently Asked Questions",
        action: "faq",
        description: "Find answers to common questions.",
        rightIcon: null,
      },
      {
        leftIcon: <IconContact />,
        heading: "Contact Us",
        action: "contact",
        description: "Get in touch with our support team.",
        rightIcon: null,
      },
      {
        leftIcon: <IconPaperBoard />,
        heading: "Warranty & Policies",
        action: "policy",
        description: "View warranty information and terms.",
        rightIcon: null,
      },
    ],
    [],
  );
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: verticalScale(80) }}
      >
        <View>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <View style={styles.backButtonInner}>
              <IconBackArrow />
            </View>
          </TouchableOpacity>
        </View>
        <View style={[styles.headerRow]}>
          <ThemeText variant="manrope.h2" style={styles.header}>
            {t("settings.helpSupport.title")}
          </ThemeText>
        </View>
        <View style={styles.section}>
          {NOTIFICATIONS.map((item, index) => (
            <ActionItem
              key={index}
              heading={t(`settings.helpSupport.${item.action}.title`)}
              description={t(`settings.helpSupport.${item.action}.description`)}
              leftIcon={item.leftIcon}
              rightIcon={item.rightIcon}
              onPress={() => {
                router.push(item.action as RoutePath);
              }}
            />
          ))}
        </View>
      </ScrollView>
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
