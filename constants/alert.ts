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

// Color mappings for each alert type
export const ALERT_COLORS: Record<
  AlertType,
  {
    background: keyof ColorPalette;
    text: keyof ColorPalette["text"];
    icon: keyof ColorPalette;
  }
> = {
  success: {
    background: "success",
    text: "primary",
    icon: "success",
  },
  error: {
    background: "error",
    text: "primary",
    icon: "error",
  },
  warning: {
    background: "warning",
    text: "primary",
    icon: "warning",
  },
  info: {
    background: "info",
    text: "primary",
    icon: "info",
  },
};
