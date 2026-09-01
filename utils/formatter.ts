/**
 * Truncates text to a specified length and adds ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const truncateWords = (text: string, limit: number) => {
  const words = text.split(" ");
  return words.length > limit ? `${words.slice(0, limit).join(" ")}...` : text;
};

/**
 * Formats a date string into a readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMS = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMS / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    // Today
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `Today at ${formattedHours}:${formattedMinutes} ${ampm}`;
  } else if (diffInDays === 1) {
    // Yesterday
    return "Yesterday";
  } else if (diffInDays < 7) {
    // Within a week
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[date.getDay()];
  } else if (diffInDays < 365) {
    // Within a year
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } else {
    // More than a year ago
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }
};

export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

export const getFullYear = (dateString: string): number => {
  return new Date(dateString).getFullYear();
};

/* -----------------------------
     Schedule → Medication mapping
  ------------------------------ */
export const getFrequency = (scheduleDay?: string) => {
  if (!scheduleDay) return "daily";
  const days = scheduleDay.split(",");
  return days.length === 7 ? "daily" : "weekly";
};

export const getTimeOfDay = (time?: string) => {
  if (!time) return "morning";

  const hour = parseInt(time.split(":")[0]);

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

// Utility to remove undefined values from an object
export function omitNullUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      // Recurse if value is a non-null object (but not an array)
      acc[key as keyof T] =
        typeof value === "object" && !Array.isArray(value) ? omitNullUndefined(value) : value;
    }
    return acc;
  }, {} as Partial<T>);
}
