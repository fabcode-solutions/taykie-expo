import React from "react";
import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { ThemeText } from "@/components/primitives/ThemeText";
import { ThemeView } from "@/components/primitives/ThemeView";
import { useTranslation } from "react-i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { verticalScale } from "@/utils/scale";

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t(LocalizedStrings.notFound.title) }} />
      <ThemeView style={styles.container}>
        <ThemeText variant="manrope.h2">{t(LocalizedStrings.notFound.message)}</ThemeText>
        <Link href="/" style={styles.link}>
          <ThemeText variant="manrope.overline">{t(LocalizedStrings.notFound.goHome)}</ThemeText>
        </Link>
      </ThemeView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: verticalScale(20),
  },
  link: {
    marginTop: verticalScale(15),
    paddingVertical: verticalScale(15),
  },
});
