import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

// Import all translations
import enUS from "./en-US.json";
import es419 from "./es-419.json";
import esES from "./es-ES.json";

// Get user's preferred language order from device settings
function getUserLanguagePreferences(): string[] {
  const deviceLocales = getLocales();
  const preferences: string[] = [];

  // Add user's preferred languages in order
  for (const locale of deviceLocales) {
    if (locale.languageCode) {
      // Add full locale (e.g., 'es-MX')
      if (locale.regionCode) {
        preferences.push(`${locale.languageCode}-${locale.regionCode}`);
      }
      // Add language-only (e.g., 'es')
      if (!preferences.includes(locale.languageCode)) {
        preferences.push(locale.languageCode);
      }
    }
  }

  // English as final fallback
  if (!preferences.includes("en")) {
    preferences.push("en");
  }

  return preferences.length ? preferences : ["en"];
}

const userLanguagePreferences = getUserLanguagePreferences();

i18n.use(initReactI18next).init({
  resources: {
    "en-US": { translation: enUS },
    "es-419": { translation: es419 },
    "es-ES": { translation: esES },
    // Language-only fallbacks for i18next
    "en": { translation: enUS },
    // Use Spain Spanish as the default for language-only 'es'
    // to maximize coverage across the app's keys
    "es": { translation: esES },
  },
  lng: userLanguagePreferences[0], // Primary language preference
  fallbackLng: userLanguagePreferences.slice(1), // Remaining preferences as fallbacks
  interpolation: {
    escapeValue: false,
  },
  // Enable clean key separation
  keySeparator: ".",
  nsSeparator: false, // Disable namespace separator since we're not using namespaces
});

export default i18n;
