import React, { useEffect } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import type { Theme } from "@/theme";
import { ThemeText } from "@/components/primitives";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { ThemeButton } from "@/components";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useOnboardingStore } from "@/stores/onboardingStore";
import OnboardingLayout from "@/components/onboarding/OnboardingLayout";
import { t } from "i18next";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { getDeviceTimezone } from "@/utils/timezone";

// The backend accepts any valid IANA timezone, not just these — this list
// is just a convenience picker for the app's target market (Australia).
// If the device's auto-detected zone isn't one of these (e.g. a tester on a
// non-AU phone), it's still preserved and sent as-is; see selectedTimezoneName.
export const TIMEZONES = [
  { code: "Australia/Sydney", name: "Sydney (NSW / ACT / VIC / TAS)" },
  { code: "Australia/Melbourne", name: "Melbourne (VIC)" },
  { code: "Australia/Brisbane", name: "Brisbane (QLD)" },
  { code: "Australia/Adelaide", name: "Adelaide (SA)" },
  { code: "Australia/Darwin", name: "Darwin (NT)" },
  { code: "Australia/Perth", name: "Perth (WA)" },
  { code: "Australia/Hobart", name: "Hobart (TAS)" },
  { code: "Australia/Broken_Hill", name: "Broken Hill (Far West NSW)" },
  { code: "Australia/Eucla", name: "Eucla (WA border)" },
  { code: "Australia/Lindeman", name: "Lindeman (Whitsundays, QLD)" },
  { code: "Australia/Lord_Howe", name: "Lord Howe Island" },
];

export const COUNTRIES = [
  { code: "AU", name: "Australia", languages: [{ code: "en", name: "English" }] },
  { code: "US", name: "United States", languages: [{ code: "en", name: "English" }] },
  { code: "GB", name: "United Kingdom", languages: [{ code: "en", name: "English" }] },
  {
    code: "CA",
    name: "Canada",
    languages: [
      { code: "en", name: "English" },
      { code: "fr", name: "French" }, // Simplified from fr-CA
    ],
  },
  { code: "NZ", name: "New Zealand", languages: [{ code: "en", name: "English" }] },
  {
    code: "IN",
    name: "India",
    languages: [
      { code: "en", name: "English" },
      { code: "hi", name: "Hindi" }, // Simplified from hi-IN
    ],
  },
  { code: "DE", name: "Germany", languages: [{ code: "de", name: "German" }] },
  { code: "FR", name: "France", languages: [{ code: "fr", name: "French" }] }, // Simplified from fr-FR
  { code: "ES", name: "Spain", languages: [{ code: "es", name: "Spanish" }] }, // Simplified from es-ES
  { code: "MX", name: "Mexico", languages: [{ code: "es", name: "Spanish" }] }, // Simplified from es-MX
  { code: "BR", name: "Brazil", languages: [{ code: "pt", name: "Portuguese" }] }, // Simplified from pt-BR
  { code: "JP", name: "Japan", languages: [{ code: "ja", name: "Japanese" }] },
  { code: "SG", name: "Singapore", languages: [{ code: "en", name: "English" }] },
  {
    code: "AE",
    name: "United Arab Emirates",
    languages: [
      { code: "ar", name: "Arabic" }, // Simplified from ar-AE
      { code: "en", name: "English" },
    ],
  },
].sort((a, b) => a.name.localeCompare(b.name));

const UNIQUE_LANGUAGES = Array.from(
  new Map(COUNTRIES.flatMap((c) => c.languages).map((l) => [l.code, l])).values(),
).sort((a, b) => a.name.localeCompare(b.name));

export default function CountryLanguage() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const {
    currentStep,
    totalSteps,
    user_country,
    user_language,
    user_timezone,
    setCountryLanguage,
    setTimezone,
    prevStep,
    setStep,
  } = useOnboardingStore();

  const [selectedCountry, setSelectedCountry] = React.useState(user_country || COUNTRIES[0].code);
  const getDefaultLanguage = (countryCode: string) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    return country?.languages?.[0]?.code || "en";
  };

  const [selectedLanguage, setSelectedLanguage] = React.useState(
    user_language || UNIQUE_LANGUAGES[0].code,
  );
  // Falls back to the device's own detected zone (not just Sydney) so a
  // tester/user outside Australia still sees their real zone pre-selected
  // rather than a wrong default.
  const [selectedTimezone, setSelectedTimezone] = React.useState(
    user_timezone ||  TIMEZONES[0].code, // ||getDeviceTimezone() 
  );

  const [countryOpen, setCountryOpen] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const [timezoneOpen, setTimezoneOpen] = React.useState(false);

  const selectedCountryName = React.useMemo(
    () =>
      COUNTRIES.find((c) => c.code === selectedCountry)?.name ||
      t(LocalizedStrings.onboarding.select_country),
    [selectedCountry],
  );

  const selectedLanguageName = React.useMemo(
    () =>
      UNIQUE_LANGUAGES.find((l) => l.code === selectedLanguage)?.name ||
      t(LocalizedStrings.onboarding.select_language),
    [selectedLanguage],
  );

  // Any valid IANA zone is accepted by the backend, so a detected zone
  // outside our AU picker list (e.g. a non-AU tester) still shows its real
  // name rather than falling back to a generic placeholder.
  const selectedTimezoneName = React.useMemo(
    () => TIMEZONES.find((z) => z.code === selectedTimezone)?.name || selectedTimezone,
    [selectedTimezone],
  );

  useEffect(() => {
    const defaultLang = getDefaultLanguage(selectedCountry);
    setSelectedLanguage(defaultLang);
  }, [selectedCountry]);

  const handleContinue = () => {
    setCountryLanguage(selectedCountry, selectedLanguage);
    setTimezone(selectedTimezone);
    setStep(2);
    router.push("/(onboarding)/pair-device");
  };

  const handleSkip = () => {
    setStep(2);
    router.push("/(onboarding)/pair-device");
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      showBack
      showSkip
      onSkip={handleSkip}
    >
      <View style={styles.heading}>
        <ThemeText variant="gs.h2" style={styles.title}>
          {t(LocalizedStrings.onboarding.your_location)}
        </ThemeText>
        <ThemeText
          variant="manrope.body1"
          style={[styles.subtitle, { color: theme.colors.text.secondary2 }]}
        >
          {t(LocalizedStrings.onboarding.set_up_taykie_location)}
        </ThemeText>
      </View>

      {/* Country Selector */}
      <ThemeText variant="manrope.body2Bold" style={styles.label}>
        {t(LocalizedStrings.profile.country)}
      </ThemeText>
      <TouchableOpacity
        style={[
          styles.selector,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
        ]}
        onPress={() => {
          setCountryOpen(!countryOpen);
          setLanguageOpen(false);
        }}
      >
        <ThemeText variant="manrope.body1" style={{ color: theme.colors.text.primary }}>
          {selectedCountryName}
        </ThemeText>
        <Ionicons
          name={countryOpen ? "chevron-up" : "chevron-down"}
          size={moderateScale(18)}
          color={theme.colors.text.secondary2}
        />
      </TouchableOpacity>

      {countryOpen && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.colors.background.paper, borderColor: theme.colors.border },
          ]}
        >
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.dropdownItem,
                  selectedCountry === c.code && {
                    backgroundColor: theme.colors.primary.main,
                  },
                ]}
                onPress={() => {
                  setSelectedCountry(c.code);
                  setCountryOpen(false);
                }}
              >
                <ThemeText variant="manrope.body1" style={{ color: theme.colors.text.primary }}>
                  {c.name}
                </ThemeText>
                {selectedCountry === c.code && (
                  <Ionicons
                    name="checkmark"
                    size={moderateScale(16)}
                    color={theme.colors.primary.main}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Language Selector (Now showing all languages) */}
      <ThemeText
        variant="manrope.body2Bold"
        style={[styles.label, { marginTop: verticalScale(16) }]}
      >
        {t(LocalizedStrings.settings.language)}
      </ThemeText>
      <TouchableOpacity
        style={[
          styles.selector,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
        ]}
        onPress={() => {
          setLanguageOpen(!languageOpen);
          setCountryOpen(false);
        }}
      >
        <ThemeText variant="manrope.body1" style={{ color: theme.colors.text.primary }}>
          {selectedLanguageName}
        </ThemeText>
        <Ionicons
          name={languageOpen ? "chevron-up" : "chevron-down"}
          size={moderateScale(18)}
          color={theme.colors.text.secondary2}
        />
      </TouchableOpacity>

      {languageOpen && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.colors.background.paper, borderColor: theme.colors.border },
          ]}
        >
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {UNIQUE_LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.dropdownItem,
                  selectedLanguage === l.code && {
                    backgroundColor: theme.colors.primary.main,
                  },
                ]}
                onPress={() => {
                  setSelectedLanguage(l.code);
                  setLanguageOpen(false);
                }}
              >
                <ThemeText
                  variant="manrope.body1"
                  style={{
                    color: theme.colors.text.primary,
                  }}
                >
                  {l.name}
                </ThemeText>
                {selectedLanguage === l.code && (
                  <Ionicons
                    name="checkmark"
                    size={moderateScale(16)}
                    color={theme.colors.primary.main}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Timezone Selector */}
      <ThemeText
        variant="manrope.body2Bold"
        style={[styles.label, { marginTop: verticalScale(16) }]}
      >
        {t(LocalizedStrings.onboarding.timezone)}
      </ThemeText>
      <TouchableOpacity
        style={[
          styles.selector,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
        ]}
        onPress={() => {
          setTimezoneOpen(!timezoneOpen);
          setCountryOpen(false);
          setLanguageOpen(false);
        }}
      >
        <ThemeText variant="manrope.body1" style={{ color: theme.colors.text.primary }}>
          {selectedTimezoneName}
        </ThemeText>
        <Ionicons
          name={timezoneOpen ? "chevron-up" : "chevron-down"}
          size={moderateScale(18)}
          color={theme.colors.text.secondary2}
        />
      </TouchableOpacity>

      {timezoneOpen && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.colors.background.paper, borderColor: theme.colors.border },
          ]}
        >
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {TIMEZONES.map((z) => (
              <TouchableOpacity
                key={z.code}
                style={[
                  styles.dropdownItem,
                  selectedTimezone === z.code && {
                    backgroundColor: theme.colors.primary.main,
                  },
                ]}
                onPress={() => {
                  setSelectedTimezone(z.code);
                  setTimezoneOpen(false);
                }}
              >
                <ThemeText variant="manrope.body1" style={{ color: theme.colors.text.primary }}>
                  {z.name}
                </ThemeText>
                {selectedTimezone === z.code && (
                  <Ionicons
                    name="checkmark"
                    size={moderateScale(16)}
                    color={theme.colors.primary.main}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.cta}>
        <ThemeButton
          title={t(LocalizedStrings.common.continue)}
          onPress={handleContinue}
          style={styles.btn}
          textStyle={styles.btnText}
          fullWidth
        />
      </View>
    </OnboardingLayout>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heading: {
      marginTop: verticalScale(8),
      marginBottom: verticalScale(28),
      gap: verticalScale(8),
    },
    title: { textAlign: "left" },
    subtitle: {},
    label: {
      marginBottom: verticalScale(8),
      color: theme.colors.text.primary,
    },
    selector: {
      height: verticalScale(56),
      borderWidth: scale(1),
      borderRadius: moderateScale(10),
      paddingHorizontal: scale(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dropdown: {
      borderWidth: scale(1),
      borderRadius: moderateScale(10),
      marginTop: verticalScale(4),
      overflow: "hidden",
      zIndex: 99,
    },
    dropdownScroll: {
      maxHeight: verticalScale(200),
    },
    dropdownItem: {
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cta: {
      marginTop: verticalScale(32),
    },
    btn: {
      height: verticalScale(60),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
    },
    btnText: {
      color: theme.colors.slateCharcoal,
    },
  });
