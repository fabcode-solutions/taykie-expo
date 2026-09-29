import { ColorPalette } from "@/theme";
import { AlertType } from "@/types/alert";

export const ALERT_CONSTANTS = {
  DEFAULT_DURATION: 4000,
  ANIMATION_DURATION: 300,
  MAX_VISIBLE_ALERTS: 3,
  ALERT_HEIGHT: 60,
  ALERT_MARGIN: 8,
  SWIPE_THRESHOLD: 50,
} as const;

export const ALERT_ICONS: Record<AlertType, string> = {
  success: "checkmark-circle-outline",
  error: "close-circle-outline",
  warning: "warning-outline",
  info: "information-circle-outline",
};

// Each alert type maps to one brand feedback color, used as the icon badge
// tint + accent stripe on an otherwise neutral card (matches the app's
// light-card-with-colored-accent look used elsewhere, e.g. insights metric
// cards) instead of a full saturated-color toast.
export const ALERT_COLORS: Record<AlertType, { accent: keyof ColorPalette }> = {
  success: { accent: "success" },
  error: { accent: "error" },
  warning: { accent: "warning" },
  info: { accent: "info" },
};
