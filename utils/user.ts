export type UserLike =
  | {
      firstName?: string | null;
      lastName?: string | null;
      name?: string | null;
      email?: string | null;
    }
  | null
  | undefined;

const firstWord = (s?: string | null): string => {
  if (!s) return "";
  const trimmed = String(s).trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
};

/**
 * Returns a compact display name for a user:
 * - first word of firstName + first word of lastName
 * - fallback: first two words of `name`
 * - fallback: email prefix (before @)
 */
export function getUserShortName(user: UserLike): string | undefined {
  if (!user) return undefined;

  const first = firstWord(user.firstName);
  const last = firstWord(user.lastName);
  if (first || last) return [first, last].filter(Boolean).join(" ");

  if (typeof user.name === "string" && user.name.trim()) {
    const parts = user.name.trim().split(/\s+/);
    const compact = [parts[0], parts[1]].filter(Boolean).join(" ");
    if (compact) return compact;
  }

  if (user.email) {
    const idx = user.email.indexOf("@");
    if (idx > 0) return user.email.slice(0, idx);
  }
  return undefined;
}
