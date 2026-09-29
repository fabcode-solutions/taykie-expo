import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { BottomDrawer } from "./BottomDrawer";
import { ThemeText } from "./primitives";
import { Button } from "./ui/button";
import { useLidPromptStore } from "@/stores/lidPromptStore";
import { resolveLidEvent } from "@/services/api/device";
import { formatOpenTime } from "@/services/notifications.service";
import { queryClient } from "@/hooks/queries/queryClient";
import { lidEventKeys } from "@/hooks/queries/lidEvents";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useTheme } from "@/theme";
import { useAlert } from "@/provider/AlertProvider";
import { AlertPresets } from "@/utils/alert";
import { moderateScale, verticalScale } from "@/utils/scale";

/**
 * The brief's "What did you do?" prompt, shown in-app the moment a fresh lid
 * open is detected — not just as a system notification, which depends on the
 * OS actually delivering/displaying it (channel setup, foreground behavior,
 * etc.). Mounted once at the root layout, next to InAppBanner, so it can pop
 * up over whatever screen is open. Backed by useLidPromptStore, set from the
 * same place that triggers the OS notification (see bleStore's F6 handler).
 */
export function LidOpenPrompt() {
  const { t } = useTranslation();
  const theme = useTheme();
  const alert = useAlert();
  const activeEvent = useLidPromptStore((s) => s.activeEvent);
  const hide = useLidPromptStore((s) => s.hide);
  const [isResolving, setIsResolving] = useState(false);

  const openedAt = useMemo(
    () => (activeEvent ? new Date(activeEvent.openedAt) : null),
    [activeEvent],
  );

  const handleClose = useCallback(() => {
    // Dismiss / swipe-away / backdrop tap: brief §5 — stays unconfirmed,
    // resolvable later from Device > "Unconfirmed opens". No API call.
    hide();
  }, [hide]);

  const handleTookDose = useCallback(() => {
    if (!activeEvent) return;
    const eventId = activeEvent.id;
    hide();
    router.push({
      pathname: "/lid-events/[eventId]",
      params: { eventId, openedAt: activeEvent.openedAt },
    } as Href);
  }, [activeEvent, hide]);

  const handleRefilled = useCallback(async () => {
    if (!activeEvent) return;
    setIsResolving(true);
    try {
      await resolveLidEvent(activeEvent.id, { action: "refill" });
      queryClient.invalidateQueries({ queryKey: lidEventKeys.all });
      hide();
    } catch (error: any) {
      alert.show(
        AlertPresets.error(t(LocalizedStrings.common.error), error?.message),
      );
    } finally {
      setIsResolving(false);
    }
  }, [activeEvent, hide, alert, t]);

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
            disabled={isResolving}
          />
          <Button
            title={t(LocalizedStrings.lidEvent.refilled)}
            variant="outline"
            onPress={handleRefilled}
            loading={isResolving}
            disabled={isResolving}
          />
          <Button
            title={t(LocalizedStrings.lidEvent.dismiss)}
            variant="text"
            onPress={handleClose}
            disabled={isResolving}
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
