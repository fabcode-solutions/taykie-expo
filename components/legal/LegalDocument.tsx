import React from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeText } from "@/components";
import AuthScreenLayout from "@/components/shared/layout/AuthScreenLayout";
import { verticalScale } from "@/utils/scale";

type LegalDocumentProps = {
  // Namespace under `legal.*` in the i18n files (e.g. "privacy" -> legal.privacy.*).
  doc: "privacy" | "terms";
  sectionCount: number;
};

const LegalDocument = ({ doc, sectionCount }: LegalDocumentProps) => {
  const { t } = useTranslation();
  const sections = Array.from({ length: sectionCount }, (_, i) => i + 1);

  return (
    <AuthScreenLayout onBack={() => router.back()}>
      <ThemeText variant="manrope.h2">{t(`legal.${doc}.title`)}</ThemeText>

      <ThemeText variant="manrope.body2" style={{ lineHeight: verticalScale(30) }}>
        {t(`legal.${doc}.intro`)}
        {"\n\n"}
        {sections.map((n) => (
          <React.Fragment key={n}>
            <ThemeText variant="manrope.h5">
              {n}. {t(`legal.${doc}.sections.s${n}.heading`)}
              {"\n"}
            </ThemeText>
            {t(`legal.${doc}.sections.s${n}.body`)}
            {n < sectionCount ? "\n\n" : ""}
          </React.Fragment>
        ))}
      </ThemeText>
    </AuthScreenLayout>
  );
};

export default LegalDocument;
