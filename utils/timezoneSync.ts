// Keeps the account's saved time zone (users.timezone — what the server uses for reminder
// times, "today" and streaks) equal to the PHONE's zone, which is also what the Taykie's
// own clock follows (F1 TimeCalibration) and what the UI shows. The zone is not editable
// in the app, so there is no manual choice to protect: whenever the saved zone differs
// from the phone's (never set / "UTC" default, or the phone moved zones), adopt the phone's.

/** The zone to save, or null when the profile already matches the phone. */
export const getTimezoneToSync = (
  savedTimezone: string | null | undefined,
  deviceTimezone: string | undefined,
): string | null => {
  if (!deviceTimezone) return null;
  return savedTimezone === deviceTimezone ? null : deviceTimezone;
};
