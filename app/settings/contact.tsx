import React, { useCallback, useMemo } from "react";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemeText } from "@/components";
import SettingsSubScreen from "@/components/settings/SettingsSubScreen";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";

type ContactKey = "support" | "privacy" | "legal" | "security";

const CONTACTS: { key: ContactKey; email: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "support", email: "support@taykie.com", icon: "chatbubble-ellipses-outline" },
  { key: "privacy", email: "privacy@taykie.com", icon: "shield-checkmark-outline" },
  { key: "legal", email: "legal@taykie.com", icon: "document-text-outline" },
  { key: "security", email: "security@taykie.com", icon: "lock-closed-outline" },
];

export default function ContactScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const alert = useAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const H = LocalizedStrings.settings.helpSupport;

  const openEmail = useCallback(
    async (email: string) => {
      const subject = encodeURIComponent(t(H.contact.emailSubject));
      try {
        await Linking.openURL(`mailto:${email}?subject=${subject}`);
      } catch {
        alert.show(
          AlertPresets.error(
            t(H.contact.openFailedTitle),
            t(H.contact.openFailedMessage, { email }),
          ),
        );
      }
    },
    [alert, t, H],
  );

  return (
    <SettingsSubScreen title={t(H.contact.title)}>
      <ThemeText variant="manrope.body2" style={styles.intro}>
        {t(H.contact.intro)}
      </ThemeText>

      <View style={styles.list}>
        {CONTACTS.map(({ key, email, icon }) => (
          <TouchableOpacity
            key={key}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => openEmail(email)}
            accessibilityRole="button"
            accessibilityLabel={`${t(H.contact.sendEmail)}: ${email}`}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={moderateScale(20)} color={theme.colors.slateCharcoal} />
            </View>
            <View style={styles.cardText}>
              <ThemeText variant="manrope.body1Bold" style={styles.cardTitle}>
                {t(`settings.helpSupport.contact.${key}.title`)}
              </ThemeText>
              <ThemeText variant="manrope.caption" style={styles.cardDescription}>
                {t(`settings.helpSupport.contact.${key}.description`)}
              </ThemeText>
              <ThemeText variant="manrope.body2" style={styles.email}>
                {email}
              </ThemeText>
            </View>
            <Ionicons
              name="mail-outline"
              size={moderateScale(18)}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        ))}
      </View>

      <ThemeText variant="manrope.caption" style={styles.tip}>
        {t(H.contact.tip)}
      </ThemeText>
    </SettingsSubScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    intro: { color: theme.colors.text.secondary, marginBottom: verticalScale(16) },
    list: { gap: verticalScale(12) },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(12),
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
      padding: verticalScale(14),
    },
    iconWrap: {
      width: scale(40),
      height: scale(40),
      borderRadius: moderateScale(20),
      backgroundColor: theme.colors.primary.main,
      alignItems: "center",
      justifyContent: "center",
    },
    cardText: { flex: 1, gap: verticalScale(2) },
    cardTitle: { color: theme.colors.text.primary },
    cardDescription: { color: theme.colors.text.secondary },
    email: { color: theme.colors.primary.dark },
    tip: { marginTop: verticalScale(20), color: theme.colors.text.secondary },
  });
