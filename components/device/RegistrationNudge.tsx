import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemeText } from "@/components";
import { useMyRegistration } from "@/hooks/queries/deviceRegistration";
import { isNudgeDue, useRegistrationNudgeStore } from "@/stores/registrationNudgeStore";
import { fontFamily, Theme, useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

/**
 * Soft in-app nudge for users who tapped "Skip for now" on the registration step:
 * shown after 48 hours, at most twice, and never once the Taykie is registered.
 * Renders nothing otherwise — mount it inside an always-present wrapper.
 */
function RegistrationNudge() {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: registration, isSuccess } = useMyRegistration();
  const recordNudgeShown = useRegistrationNudgeStore((s) => s.recordNudgeShown);
  const [visible, setVisible] = useState(false);
  // A prompt is counted once, when it first appears — not on every re-render/refocus.
  const countedRef = useRef(false);

  useEffect(() => {
    // Only decide once we KNOW the account has no registration (not while loading/offline).
    if (!isSuccess || registration || countedRef.current) return;
    if (isNudgeDue(useRegistrationNudgeStore.getState())) {
      countedRef.current = true;
      recordNudgeShown();
      setVisible(true);
    }
  }, [isSuccess, registration, recordNudgeShown]);

  const handleRegister = useCallback(() => {
    setVisible(false);
    router.push("/settings/device-registration" as Href);
  }, []);
  const handleDismiss = useCallback(() => setVisible(false), []);

  if (!visible || registration) return null;

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Ionicons
        name="shield-checkmark-outline"
        size={moderateScale(22)}
        color={theme.colors.slateCharcoal}
      />
      <ThemeText variant="manrope.body2" style={styles.message}>
        {t(LocalizedStrings.deviceRegistration.nudge)}
      </ThemeText>
      <TouchableOpacity onPress={handleRegister} accessibilityRole="button" hitSlop={8}>
        <ThemeText variant="manrope.body2" style={styles.action}>
          {t(LocalizedStrings.deviceRegistration.nudgeAction)}
        </ThemeText>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel={t(LocalizedStrings.deviceRegistration.nudgeDismiss)}
        hitSlop={8}
      >
        <Ionicons name="close" size={moderateScale(18)} color={theme.colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

export default memo(RegistrationNudge);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      marginTop: verticalScale(16),
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(14),
      borderRadius: moderateScale(12),
      backgroundColor: theme.colors.primary.main,
    },
    message: {
      flex: 1,
      color: theme.colors.slateCharcoal,
    },
    action: {
      fontFamily: fontFamily.manrope.bold,
      fontWeight: "700" as const,
      color: theme.colors.slateCharcoal,
      textDecorationLine: "underline",
    },
  });
