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
