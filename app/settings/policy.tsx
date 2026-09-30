import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemeText } from "@/components";
import SettingsSubScreen from "@/components/settings/SettingsSubScreen";
import { Button } from "@/components/ui/button";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

export default function PolicyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const H = LocalizedStrings.settings.helpSupport;

  const sections = [
    { title: t(H.policy.warrantyTitle), body: t(H.policy.warrantyBody) },
    { title: t(H.policy.notCoveredTitle), body: t(H.policy.notCoveredBody) },
  ];

  const links = [
    { label: t(H.policy.terms), path: "/(auth)/terms-and-conditions" },
    { label: t(H.policy.privacy), path: "/(auth)/privacy-policy" },
  ];

  return (
    <SettingsSubScreen title={t(H.policy.title)}>
      <View style={styles.list}>
        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <ThemeText variant="manrope.body1Bold" style={styles.cardTitle}>
              {section.title}
            </ThemeText>
            <ThemeText variant="manrope.body2" style={styles.cardBody}>
              {section.body}
            </ThemeText>
          </View>
        ))}
      </View>

      <ThemeText variant="manrope.body1Bold" style={styles.linksTitle}>
        {t(H.policy.policiesTitle)}
      </ThemeText>
      <View style={styles.list}>
        {links.map((link) => (
          <TouchableOpacity
            key={link.path}
            style={styles.linkRow}
            activeOpacity={0.8}
            onPress={() => router.push(link.path as never)}
            accessibilityRole="link"
          >
            <ThemeText variant="manrope.body1Bold" style={styles.cardTitle}>
              {link.label}
            </ThemeText>
            <Ionicons
              name="chevron-forward"
              size={moderateScale(18)}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        ))}
      </View>

      <ThemeText variant="manrope.caption" style={styles.questions}>
        {t(H.policy.questions)}
      </ThemeText>
      <Button
        title={t(H.contact.title)}
        onPress={() => router.push("/settings/contact" as never)}
        fullWidth
        rightIcon={null}
      />
    </SettingsSubScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: { gap: verticalScale(12), marginBottom: verticalScale(24) },
    card: {
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
      padding: verticalScale(14),
      gap: verticalScale(8),
    },
    cardTitle: { color: theme.colors.text.primary },
    cardBody: { color: theme.colors.text.secondary },
    linksTitle: { marginBottom: verticalScale(10), color: theme.colors.text.primary },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
      padding: verticalScale(14),
    },
    questions: { marginBottom: verticalScale(10), color: theme.colors.text.secondary },
  });
