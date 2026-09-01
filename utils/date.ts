// Explicit locales to keep bundle small
import { es, enUS } from "date-fns/locale";

type DFNSLocale = typeof es | typeof enUS;

let currentLocale: DFNSLocale = es;

const mapLangToLocale = (lang?: string): DFNSLocale => {
  const code = String(lang || "es").toLowerCase();
  if (code.startsWith("es")) return es;
  // Default to English if not Spanish
  return enUS;
};

export const setDateLocale = (lang?: string) => {
  currentLocale = mapLangToLocale(lang);
};

export const getDateLocale = (): DFNSLocale => currentLocale;
