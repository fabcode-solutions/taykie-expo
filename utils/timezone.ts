// Wrapped in try/catch since RN's Intl support/polyfill coverage can vary
// by engine — a failure here should just omit the field (the backend
// defaults to "Australia/Sydney" when timezone is never sent) rather than
// crash the onboarding/profile submission it's attached to.
export const getDeviceTimezone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

// The backend accepts any valid IANA timezone, not just these — this list
// is just the override picker in Edit Profile for the app's target market
// (Australia). A zone outside it (e.g. a non-AU phone) is still kept and
// shown by its IANA name; see getTimezoneOptions.
export const TIMEZONES = [
  { code: "Australia/Sydney", name: "Sydney (NSW / ACT)" },
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

export const getTimezoneLabel = (code: string): string =>
  TIMEZONES.find((z) => z.code === code)?.name ?? code.replace(/_/g, " ");

/**
 * Picker options: the AU list, plus the phone's own zone and the user's
 * saved zone when either falls outside it, so neither is ever unselectable.
 */
export const getTimezoneOptions = (...extra: (string | null | undefined)[]) => {
  const codes = new Set(TIMEZONES.map((z) => z.code));
  const extraCodes = extra.filter(
    (code): code is string => !!code && code !== "UTC" && !codes.has(code),
  );
  return [...new Set(extraCodes)]
    .map((code) => ({ label: getTimezoneLabel(code), value: code, key: code }))
    .concat(TIMEZONES.map((z) => ({ label: z.name, value: z.code, key: z.code })));
};
