import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemeText } from "@/components";
import { Button } from "@/components/ui/button";
import { useAppLockStore } from "@/stores/appLockStore";
import { Theme, useTheme } from "@/theme";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";

// How long the app can stay in the background before it asks again.
const RELOCK_AFTER_MS = 30 * 1000;

// Full-screen overlay shown while the app lock is enabled and the app is locked.
export function AppLockGate() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const enabled = useAppLockStore((s) => s.enabled);
  const isLocked = useAppLockStore((s) => s.isLocked);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const authInFlight = useRef(false);

  const unlock = useCallback(async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    setIsAuthenticating(true);
    const { authenticate, unlock: markUnlocked } = useAppLockStore.getState();
    const ok = await authenticate(
      t(LocalizedStrings.settings.dataPrivacy.appLock.unlockPrompt),
      t(LocalizedStrings.common.cancel),
    );
    if (ok) markUnlocked();
    authInFlight.current = false;
    setIsAuthenticating(false);
  }, [t]);

  // Re-lock after the app has been in the background for a while. The OS
  // biometric sheet itself briefly moves the app to "inactive" on iOS, so only
  // a real "background" state starts the timer.
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAt.current = Date.now();
      } else if (state === "active") {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (since !== null && Date.now() - since >= RELOCK_AFTER_MS) {
          useAppLockStore.getState().lock();
        }
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  // Prompt automatically whenever the lock screen appears.
  useEffect(() => {
    if (enabled && isLocked) void unlock();
  }, [enabled, isLocked, unlock]);

  if (!enabled || !isLocked) return null;

  return (
    <View
      style={[styles.overlay, { backgroundColor: theme.colors.background.default }]}
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={Platform.OS === "ios" ? "finger-print" : "lock-closed"}
          size={moderateScale(36)}
          color={theme.colors.slateCharcoal}
        />
      </View>
      <ThemeText variant="manrope.h3" align="center" style={styles.title}>
        {t(LocalizedStrings.settings.dataPrivacy.appLock.lockedTitle)}
      </ThemeText>
      <ThemeText variant="manrope.body2" align="center" style={styles.message}>
        {t(LocalizedStrings.settings.dataPrivacy.appLock.lockedMessage)}
      </ThemeText>
      <Button
        title={t(LocalizedStrings.settings.dataPrivacy.appLock.unlock)}
        onPress={unlock}
        loading={isAuthenticating}
        fullWidth
        rightIcon={null}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      elevation: 9999,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: scale(32),
      gap: verticalScale(14),
    },
    iconWrap: {
      width: scale(80),
      height: scale(80),
      borderRadius: scale(40),
      backgroundColor: theme.colors.primary.main,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: verticalScale(10),
    },
    title: { color: theme.colors.text.primary },
    message: { color: theme.colors.text.secondary, marginBottom: verticalScale(14) },
  });
