import React, { useCallback, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemeText } from "@/components";
import SettingsSubScreen from "@/components/settings/SettingsSubScreen";
import { Button } from "@/components/ui/button";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_COUNT = 9;

export default function FaqScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <SettingsSubScreen title={t(LocalizedStrings.settings.helpSupport.faq.title)}>
      <ThemeText variant="manrope.body2" style={styles.intro}>
        {t(LocalizedStrings.settings.helpSupport.faq.intro)}
      </ThemeText>

      <View style={styles.list}>
        {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n) => {
          const isOpen = openIndex === n;
          return (
            <TouchableOpacity
              key={n}
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => toggle(n)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <View style={styles.questionRow}>
                <ThemeText variant="manrope.body1Bold" style={styles.question}>
                  {t(`settings.helpSupport.faq.items.q${n}.question`)}
                </ThemeText>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={moderateScale(18)}
                  color={theme.colors.text.secondary}
                />
              </View>
              {isOpen && (
                <ThemeText variant="manrope.body2" style={styles.answer}>
                  {t(`settings.helpSupport.faq.items.q${n}.answer`)}
                </ThemeText>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ThemeText variant="manrope.body1Bold" style={styles.stillNeedHelp}>
        {t(LocalizedStrings.settings.helpSupport.faq.stillNeedHelp)}
      </ThemeText>
      <Button
        title={t(LocalizedStrings.settings.helpSupport.faq.contactCta)}
        onPress={() => router.push("/settings/contact" as never)}
        fullWidth
        rightIcon={null}
      />
    </SettingsSubScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    intro: { color: theme.colors.text.secondary, marginBottom: verticalScale(16) },
    list: { gap: verticalScale(10), marginBottom: verticalScale(24) },
    item: {
      backgroundColor: theme.colors.white,
      borderRadius: moderateScale(10),
      borderWidth: scale(1),
      borderColor: theme.colors.divider,
      padding: verticalScale(14),
    },
    questionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: scale(10),
    },
    question: { flex: 1, color: theme.colors.text.primary },
    answer: { marginTop: verticalScale(10), color: theme.colors.text.secondary },
    stillNeedHelp: { marginBottom: verticalScale(10), color: theme.colors.text.primary },
  });
