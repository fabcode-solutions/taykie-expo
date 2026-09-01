import Constants from "expo-constants";

const extraApiBase: string | undefined =
  // Newer Expo
  // @ts-ignore
  (Constants?.expoConfig as any)?.extra?.apiBaseUrl ??
  // Older Expo manifest2
  // @ts-ignore
  (Constants as any)?.manifest2?.extra?.apiBaseUrl;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? extraApiBase;

export const REQUEST_TIMEOUT_MS = 15000;
export const DEFAULT_RETRY_COUNT = 2; // For idempotent GETs

const envDemo = process.env.EXPO_PUBLIC_DEMO_AUTH;
const coerceBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

// Default to false unless explicitly enabled via env or app config
export const DEMO_AUTH = coerceBool(envDemo ?? false);

export const DEFAULT_TEAM_ID: string | undefined = process.env.EXPO_PUBLIC_DEFAULT_TEAM_ID as
  | string
  | undefined;
