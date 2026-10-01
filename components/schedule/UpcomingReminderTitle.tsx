import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleProp, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemeText } from "@/components";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { UpcomingReminderData } from "@/types/schedule.types";

/** 5400 → "1h 30m 0s", 125 → "2m 5s", 45 → "45s". */
export const formatCountdown = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// Small pause after reaching zero before asking for the next dose, so the backend (which
// only returns doses strictly in the future) has moved on to the following one.
const REFETCH_DELAY_MS = 1500;

interface UpcomingReminderTitleProps {
  reminder: UpcomingReminderData;
  style?: StyleProp<TextStyle>;
  /** Countdown reached zero — fetch the next upcoming reminder. */
  onElapsed: () => void;
}

/**
 * "Take {medicine} in 1h 29m 58s", ticking every second.
 *
 * The count is anchored to the moment the reminder was fetched (the backend's
 * `secondsLeft`) and measured with the phone's clock from there, so it stays correct
 * across re-renders and when the app returns from the background. It is its own component
 * so only this line re-renders each second, not the whole Home screen.
 */
function UpcomingReminderTitle({ reminder, style, onElapsed }: UpcomingReminderTitleProps) {
  const { t } = useTranslation();
  // New anchor whenever a new reminder object arrives (every fetch creates one).
  const targetMs = useMemo(
    () => Date.now() + Math.max(0, reminder.secondsLeft ?? 0) * 1000,
    [reminder],
  );
  const [remaining, setRemaining] = useState(() => Math.ceil((targetMs - Date.now()) / 1000));
  const onElapsedRef = useRef(onElapsed);
  onElapsedRef.current = onElapsed;

  useEffect(() => {
    const compute = () => Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
    setRemaining(compute());

    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
        refetchTimer = setTimeout(() => onElapsedRef.current(), REFETCH_DELAY_MS);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (refetchTimer) clearTimeout(refetchTimer);
    };
  }, [targetMs]);

  return (
    <ThemeText variant="manrope.body1Bold" style={style}>
      {`${t(LocalizedStrings.common.take)} ${reminder.name} ${t(LocalizedStrings.common.in)} ${formatCountdown(remaining)}`}
    </ThemeText>
  );
}

export default memo(UpcomingReminderTitle);
