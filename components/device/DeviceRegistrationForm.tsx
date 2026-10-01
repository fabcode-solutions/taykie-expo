import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemeInput, ThemeText } from "@/components";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyRegistration, useRegisterDevice } from "@/hooks/queries/deviceRegistration";
import { DeviceRegistration } from "@/services/api/deviceRegistration";
import { fontFamily, Theme, useTheme } from "@/theme";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { isValidSerial, normalizeSerial, SERIAL_MAX_LENGTH } from "@/utils/deviceSerial";
import { moderateScale, scale, verticalScale } from "@/utils/scale";

type FormStyles = ReturnType<typeof createStyles>;

const SUCCESS_DISPLAY_MS = 1600;

interface DeviceRegistrationFormProps {
  /**
   * onboarding: shows the screen heading and a "Skip for now" link (its own header isn't
   * provided by the layout). settings: the surrounding screen already shows the title.
   */
  mode: "onboarding" | "settings";
  /** Registration succeeded (after the brief success state) or was already done. */
  onDone?: () => void;
  onSkip?: () => void;
}

const formatDate = (iso: string, language: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" });
};

// ─── Already registered ───────────────────────────────────────────────────────

const RegisteredCard = memo(function RegisteredCard({
  registration,
  styles,
  iconColor,
}: {
  registration: DeviceRegistration;
  styles: FormStyles;
  iconColor: string;
}) {
  const { t, i18n } = useTranslation();
  const rows = [
    {
      label: t(LocalizedStrings.deviceRegistration.registeredSerial),
      value: registration.serialNumber,
    },
    {
      label: t(LocalizedStrings.deviceRegistration.registeredOn),
      value: formatDate(registration.registeredAt, i18n.language),
    },
    {
      label: t(LocalizedStrings.deviceRegistration.warrantyUntil),
      value: formatDate(registration.warrantyEndsAt, i18n.language),
    },
  ];

  return (
    <View style={styles.registeredCard}>
      <View style={styles.registeredBadge}>
        <Ionicons name="shield-checkmark" size={moderateScale(28)} color={iconColor} />
      </View>
      <ThemeText variant="manrope.h4" style={styles.registeredTitle}>
        {t(LocalizedStrings.deviceRegistration.registeredTitle)}
      </ThemeText>
      {rows.map((row) => (
        <View key={row.label} style={styles.registeredRow}>
          <ThemeText variant="manrope.caption" style={styles.registeredLabel}>
            {row.label}
          </ThemeText>
          <ThemeText variant="manrope.body1Bold" style={styles.registeredValue}>
            {row.value}
          </ThemeText>
        </View>
      ))}
    </View>
  );
});

// ─── Form ─────────────────────────────────────────────────────────────────────

function DeviceRegistrationForm({ mode, onDone, onSkip }: DeviceRegistrationFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: registration, isLoading: isCheckingRegistration } = useMyRegistration();
  const registerMutation = useRegisterDevice();

  const [serial, setSerial] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    },
    [],
  );

  const valid = isValidSerial(serial);
  // Inline format validation "before they submit" — but not while they're still typing a
  // short serial: shown after leaving the field / a submit attempt, or once it's too long.
  const formatError =
    serial.length > 0 && !valid && (touched || serial.length > SERIAL_MAX_LENGTH)
      ? t(LocalizedStrings.deviceRegistration.invalidFormat)
      : undefined;
  const error = formatError ?? serverError ?? undefined;

  const handleChange = useCallback((text: string) => {
    setSerial(normalizeSerial(text));
    setServerError(null);
  }, []);
  const handleBlur = useCallback(() => setTouched(true), []);

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    if (!valid || registerMutation.isPending) return;
    setServerError(null);
    try {
      await registerMutation.mutateAsync(serial);
      setShowSuccess(true);
      doneTimerRef.current = setTimeout(() => onDone?.(), SUCCESS_DISPLAY_MS);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 403) setServerError(t(LocalizedStrings.deviceRegistration.blocked));
      else if (status === 404 || status === 422)
        setServerError(t(LocalizedStrings.deviceRegistration.invalidFormat));
      else
        setServerError((err as { message?: string })?.message ?? t(LocalizedStrings.common.error));
    }
  }, [valid, serial, registerMutation, onDone, t]);

  const subtitle = (
    <ThemeText variant="manrope.body1" style={styles.subtitle}>
      {t(LocalizedStrings.deviceRegistration.subtitle)}
    </ThemeText>
  );

  // Stable outer wrapper: only the contents below swap (loading / registered / form).
  return (
    <View>
      {mode === "onboarding" && (
        <ThemeText variant="gs.h2" style={styles.title}>
          {t(LocalizedStrings.deviceRegistration.title)}
        </ThemeText>
      )}

      {isCheckingRegistration ? (
        <View style={styles.block}>
          <Skeleton width="90%" height={moderateScale(14)} />
          <Skeleton width="100%" height={verticalScale(52)} borderRadius={moderateScale(12)} />
          <Skeleton width="100%" height={verticalScale(52)} borderRadius={moderateScale(26)} />
        </View>
      ) : registration ? (
        <View style={styles.block}>
          <RegisteredCard
            registration={registration}
            styles={styles}
            iconColor={theme.colors.slateCharcoal}
          />
          {mode === "onboarding" && (
            <Button
              title={t(LocalizedStrings.common.continue)}
              onPress={() => onDone?.()}
              rightIcon={null}
            />
          )}
        </View>
      ) : (
        <View style={styles.block}>
          {subtitle}

          <ThemeInput
            label={t(LocalizedStrings.deviceRegistration.serialLabel)}
            placeholder={t(LocalizedStrings.deviceRegistration.serialPlaceholder)}
            hint={t(LocalizedStrings.deviceRegistration.serialHelper)}
            value={serial}
            onChangeText={handleChange}
            onBlur={handleBlur}
            error={error}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={SERIAL_MAX_LENGTH + 4}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!registerMutation.isPending && !showSuccess}
          />

          {showSuccess && (
            <View style={styles.successBanner} accessibilityLiveRegion="polite">
              <Ionicons
                name="checkmark-circle"
                size={moderateScale(20)}
                color={theme.colors.success.main}
              />
              <ThemeText variant="manrope.body2" style={styles.successText}>
                {t(LocalizedStrings.deviceRegistration.success)}
              </ThemeText>
            </View>
          )}

          <Button
            title={t(LocalizedStrings.deviceRegistration.activate)}
            onPress={handleSubmit}
            loading={registerMutation.isPending}
            disabled={!valid || registerMutation.isPending || showSuccess}
            rightIcon={null}
          />

          {mode === "onboarding" && onSkip && (
            <TouchableOpacity
              onPress={onSkip}
              disabled={registerMutation.isPending || showSuccess}
              style={styles.skip}
              accessibilityRole="button"
            >
              <ThemeText variant="manrope.body2" style={styles.skipText}>
                {t(LocalizedStrings.deviceRegistration.skip)}
              </ThemeText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default memo(DeviceRegistrationForm);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      textAlign: "left",
      marginTop: verticalScale(8),
      marginBottom: verticalScale(8),
    },
    subtitle: {
      color: theme.colors.text.secondary2,
    },
    block: {
      gap: verticalScale(18),
      marginTop: verticalScale(8),
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(8),
      padding: scale(12),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.success.light,
    },
    successText: {
      flex: 1,
      color: theme.colors.text.primary,
    },
    skip: {
      alignSelf: "center",
      paddingVertical: verticalScale(8),
    },
    skipText: {
      color: theme.colors.text.secondary2,
      textDecorationLine: "underline",
    },
    registeredCard: {
      alignItems: "center",
      gap: verticalScale(10),
      padding: scale(20),
      borderRadius: moderateScale(16),
      backgroundColor: theme.colors.white,
    },
    registeredBadge: {
      width: moderateScale(56),
      height: moderateScale(56),
      borderRadius: 999,
      backgroundColor: theme.colors.primary.main,
      alignItems: "center",
      justifyContent: "center",
    },
    registeredTitle: {
      color: theme.colors.text.primary,
      marginBottom: verticalScale(6),
    },
    registeredRow: {
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: scale(12),
      paddingVertical: verticalScale(6),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.divider,
    },
    registeredLabel: {
      color: theme.colors.text.secondary,
    },
    registeredValue: {
      flexShrink: 1,
      textAlign: "right",
      fontFamily: fontFamily.manrope.bold,
    },
  });
