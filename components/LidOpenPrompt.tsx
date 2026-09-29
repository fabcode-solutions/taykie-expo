import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { BottomDrawer } from "./BottomDrawer";
import { ThemeText } from "./primitives";
import { Button } from "./ui/button";
import { useUnconfirmedLidEvents, useResolveLidEvent } from "@/hooks/queries/lidEvents";
import { formatOpenTime } from "@/services/notifications.service";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTheme } from "@/theme";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { moderateScale, verticalScale } from "@/utils/scale";

/**
 * The brief's "What did you do?" prompt for ANY still-unconfirmed lid event —
 * not only one just detected this session. Mounted once at the root layout
 * (next to InAppBanner), so it renders as an overlay over whatever screen is
 * open, on its own, independent of navigation.
 *
 * Driven directly by useUnconfirmedLidEvents (oldest first, per the backend's
 * own ordering) rather than a separate "is this fresh" signal: as long as
 * that list is non-empty, something here is unconfirmed and gets prompted
 * for. That list is invalidated after every history upload and after
 * resolving an event (see bleStore.ts / this file's own mutation), and
 * additionally polled every 30s as a safety net — see the hook.
 */
export function LidOpenPrompt() {
  const { t } = useTranslation();
  const theme = useTheme();
  const alert = useAlert();
  const { data: unconfirmedEvents } = useUnconfirmedLidEvents();
  const resolveMutation = useResolveLidEvent();

  // Dismissed here means "not right now" — the event stays unconfirmed on
  // the backend (brief §5), so it's still in `unconfirmedEvents` on the next
  // fetch. Tracking dismissals only in local, unpersisted state is what
  // keeps it from being re-shown in an instant loop the moment it's
  // dismissed, while still coming back next time the app opens (a fresh
  // mount starts with an empty set) — matching "still unconfirmed -> still
  // prompted for" without nagging mid-session.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeEvent = useMemo(
    () => unconfirmedEvents?.find((e) => !dismissedIds.has(e.id)) ?? null,
    [unconfirmedEvents, dismissedIds],
  );

  const openedAt = useMemo(
    () => (activeEvent ? new Date(activeEvent.openedAt) : null),
    [activeEvent],
  );

  // Hides the drawer immediately, regardless of which action was tapped —
  // the query-driven `activeEvent` above would otherwise only disappear
  // once the resulting mutation/refetch round-trips (a visible delay for
  // Refilled, and not at all for Took Dose, which doesn't resolve anything
  // by itself). Local-only, same as handleClose: the event stays
  // unconfirmed server-side until actually resolved, and reappears later if
  // it still is.
  const hideLocally = useCallback((eventId: string) => {
    setDismissedIds((prev) => new Set(prev).add(eventId));
  }, []);

  const handleClose = useCallback(() => {
    if (!activeEvent) return;
    hideLocally(activeEvent.id);
  }, [activeEvent, hideLocally]);

  const handleTookDose = useCallback(() => {
    if (!activeEvent) return;
    const eventId = activeEvent.id;
    const openedAtParam = activeEvent.openedAt;
    hideLocally(eventId);
    // This BottomDrawer wraps RN's own <Modal> (see BottomDrawer.tsx) —
    // closing it and pushing a new screen in the same commit is the known
    // trigger for the Yoga/Fabric shadow-tree crash documented elsewhere in
    // this app (ScheduleModals.tsx, MedicineTaken.tsx); same fix, same
    // reasoning: let the close finish first.
    setTimeout(() => {
      router.push({
        pathname: "/lid-events/[eventId]",
        params: { eventId, openedAt: openedAtParam },
      } as Href);
    }, 300);
  }, [activeEvent, hideLocally]);

  const handleRefilled = useCallback(async () => {
    if (!activeEvent) return;
    const eventId = activeEvent.id;
    hideLocally(eventId);
    try {
      await resolveMutation.mutateAsync({ eventId, request: { action: "refill" } });
    } catch (error: any) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error?.message));
    }
  }, [activeEvent, hideLocally, resolveMutation, alert, t]);

  return (
    <BottomDrawer
      isVisible={!!activeEvent}
      onClose={handleClose}
      title={t(LocalizedStrings.lidEvent.title)}
      height="45%"
      showHandle
      closeOnSwipeDown
      headingStyle={{ fontSize: moderateScale(24), fontWeight: "500" as const }}
    >
      <View style={styles.body}>
        {openedAt && (
          <ThemeText variant="manrope.body1" style={{ color: theme.colors.text.secondary }}>
            {t(LocalizedStrings.lidEvent.body, { time: formatOpenTime(openedAt) })}
          </ThemeText>
        )}

        <View style={styles.actions}>
          <Button
            title={t(LocalizedStrings.lidEvent.tookDose)}
            onPress={handleTookDose}
            disabled={resolveMutation.isPending}
          />
          <Button
            title={t(LocalizedStrings.lidEvent.refilled)}
            variant="outline"
            onPress={handleRefilled}
            loading={resolveMutation.isPending}
            disabled={resolveMutation.isPending}
          />
          <Button
            title={t(LocalizedStrings.lidEvent.dismiss)}
            variant="text"
            onPress={handleClose}
            disabled={resolveMutation.isPending}
          />
        </View>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: moderateScale(20),
    gap: verticalScale(20),
  },
  actions: {
    gap: verticalScale(12),
  },
});
