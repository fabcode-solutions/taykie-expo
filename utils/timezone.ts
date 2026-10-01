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

// Friendly names for the Australian zones, used to DISPLAY the phone's zone in Edit
// Profile (the zone itself isn't editable). Any other IANA zone is shown by its name.
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
